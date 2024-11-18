use chrono::DateTime;
use chrono::Duration;
use chrono::Utc;
use editoast_models::DbConnection;
use editoast_schemas::rolling_stock::LoadingGaugeType;
use editoast_schemas::train_schedule::Comfort;
use editoast_schemas::train_schedule::MarginValue;
use editoast_schemas::train_schedule::PathItem;
use editoast_schemas::train_schedule::PathItemLocation;
use itertools::Itertools;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::core::pathfinding::PathfindingInputError;
use crate::core::stdcm::STDCMPathItem;
use crate::core::stdcm::STDCMStepTimingData;
use crate::error::Result;
use crate::models::temporary_speed_limits::TemporarySpeedLimit;
use crate::models::towed_rolling_stock::TowedRollingStockModel;
use crate::models::work_schedules::WorkSchedule;
use crate::models::List;
use crate::views::path::path_item_cache::PathItemCache;
use crate::views::path::pathfinding::PathfindingFailure;
use crate::views::path::pathfinding::PathfindingResult;
use crate::Retrieve;
use crate::SelectionSettings;

use super::StdcmError;

editoast_common::schemas! {
    Request,
    PathfindingItem,
    StepTimingData,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, ToSchema)]
pub(super) struct PathfindingItem {
    /// The stop duration in milliseconds, None if the train does not stop.
    duration: Option<u64>,
    /// The associated location
    location: PathItemLocation,
    /// Time at which the train should arrive at the location, if specified
    timing_data: Option<StepTimingData>,
}

/// Convert the list of pathfinding items into a list of path item
pub(super) fn convert_steps(steps: &[PathfindingItem]) -> Vec<PathItem> {
    steps
        .iter()
        .map(|step| PathItem {
            id: Default::default(),
            deleted: false,
            location: step.location.clone(),
        })
        .collect()
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, ToSchema)]
struct StepTimingData {
    /// Time at which the train should arrive at the location
    arrival_time: DateTime<Utc>,
    /// The train may arrive up to this duration before the expected arrival time
    arrival_time_tolerance_before: u64,
    /// The train may arrive up to this duration after the expected arrival time
    arrival_time_tolerance_after: u64,
}

/// An STDCM request
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub(super) struct Request {
    /// Deprecated, first step arrival time should be used instead
    pub(super) start_time: Option<DateTime<Utc>>,
    pub(super) steps: Vec<PathfindingItem>,
    pub(super) rolling_stock_id: i64,
    pub(super) towed_rolling_stock_id: Option<i64>,
    pub(super) electrical_profile_set_id: Option<i64>,
    pub(super) work_schedule_group_id: Option<i64>,
    pub(super) temporary_speed_limit_group_id: Option<i64>,
    pub(super) comfort: Comfort,
    /// By how long we can shift the departure time in milliseconds
    /// Deprecated, first step data should be used instead
    pub(super) maximum_departure_delay: Option<u64>,
    /// Specifies how long the total run time can be in milliseconds
    /// Deprecated, first step data should be used instead
    pub(super) maximum_run_time: Option<u64>,
    /// Train categories for speed limits
    // TODO: rename the field and its description
    pub(super) speed_limit_tags: Option<String>,
    /// Margin before the train passage in seconds
    ///
    /// Enforces that the path used by the train should be free and
    /// available at least that many milliseconds before its passage.
    #[serde(default)]
    pub(super) time_gap_before: u64,
    /// Margin after the train passage in milliseconds
    ///
    /// Enforces that the path used by the train should be free and
    /// available at least that many milliseconds after its passage.
    #[serde(default)]
    pub(super) time_gap_after: u64,
    /// Can be a percentage `X%`, a time in minutes per 100 kilometer `Xmin/100km`
    #[serde(default)]
    #[schema(value_type = Option<String>, example = json!(["5%", "2min/100km"]))]
    pub(super) margin: Option<MarginValue>,
    /// Total mass of the consist in kg
    pub(super) total_mass: Option<f64>,
    /// Total length of the consist in meters
    pub(super) total_length: Option<f64>,
    /// Maximum speed of the consist in km/h
    pub(super) max_speed: Option<f64>,
    pub(super) loading_gauge_type: Option<LoadingGaugeType>,
}

impl Request {
    /// Returns the earliest time that has been set on any step
    pub(super) fn get_earliest_step_time(&self) -> DateTime<Utc> {
        // Get the earliest time that has been specified for any step
        self.start_time
            .or_else(|| {
                self.steps
                    .iter()
                    .flat_map(|step| step.timing_data.iter())
                    .map(|data| {
                        data.arrival_time
                            - Duration::milliseconds(data.arrival_time_tolerance_before as i64)
                    })
                    .next()
            })
            .expect("No time specified for stdcm request")
    }

    /// Returns the earliest tolerance window that has been set on any step
    fn get_earliest_step_tolerance_window(&self) -> u64 {
        // Get the earliest time window that has been specified for any step, if maximum_run_time is not none
        self.steps
            .iter()
            .flat_map(|step| step.timing_data.iter())
            .map(|data| data.arrival_time_tolerance_before + data.arrival_time_tolerance_after)
            .next()
            .unwrap_or(0)
    }

    /// Returns the request's total stop time
    fn get_total_stop_time(&self) -> u64 {
        self.steps
            .iter()
            .map(|step: &PathfindingItem| step.duration.unwrap_or_default())
            .sum()
    }

    // Returns the maximum departure delay for the train.
    pub(super) fn get_maximum_departure_delay(&self, simulation_run_time: u64) -> u64 {
        self.maximum_departure_delay
            .unwrap_or(simulation_run_time + self.get_earliest_step_tolerance_window())
    }

    // Maximum duration between train departure and arrival, including all stops
    pub(super) fn get_maximum_run_time(&self, simulation_run_time: u64) -> u64 {
        self.maximum_run_time
            .unwrap_or(2 * simulation_run_time + self.get_total_stop_time())
    }

    /// Returns the earliest time at which the train may start
    pub(super) fn get_earliest_departure_time(&self, simulation_run_time: u64) -> DateTime<Utc> {
        // Prioritize: start time, or first step time, or (first specified time - max run time)
        self.start_time.unwrap_or(
            self.steps
                .first()
                .and_then(|step| step.timing_data.clone())
                .and_then(|data| {
                    Option::from(
                        data.arrival_time
                            - Duration::milliseconds(data.arrival_time_tolerance_before as i64),
                    )
                })
                .unwrap_or(
                    self.get_earliest_step_time()
                        - Duration::milliseconds(
                            self.get_maximum_run_time(simulation_run_time) as i64
                        ),
                ),
        )
    }

    pub(super) fn get_latest_simulation_end(&self, simulation_run_time: u64) -> DateTime<Utc> {
        self.get_earliest_departure_time(simulation_run_time)
            + Duration::milliseconds(
                (self.get_maximum_run_time(simulation_run_time)
                    + self.get_earliest_step_tolerance_window()) as i64,
            )
    }

    /// Return the list of speed limits that are active at any point in a given time range
    pub(super) async fn get_temporary_speed_limits(
        &self,
        conn: &mut DbConnection,
        simulation_run_time: u64,
    ) -> Result<Vec<crate::core::stdcm::TemporarySpeedLimit>> {
        let start_date_time = self.get_earliest_departure_time(simulation_run_time);
        let end_date_time = self.get_latest_simulation_end(simulation_run_time);
        if end_date_time <= start_date_time || self.temporary_speed_limit_group_id.is_none() {
            return Ok(Vec::new());
        }
        let temporary_speed_limit_group_id = self.temporary_speed_limit_group_id.unwrap();
        let selection_settings: SelectionSettings<TemporarySpeedLimit> = SelectionSettings::new()
            .filter(move || {
                TemporarySpeedLimit::TEMPORARY_SPEED_LIMIT_GROUP_ID
                    .eq(temporary_speed_limit_group_id)
            });
        let applicable_speed_limits = TemporarySpeedLimit::list(conn, selection_settings)
            .await?
            .into_iter()
            .filter(|speed_limit| {
                !(end_date_time <= speed_limit.start_date_time.and_utc()
                    || speed_limit.end_date_time.and_utc() <= start_date_time)
            })
            .map_into()
            .collect();
        Ok(applicable_speed_limits)
    }

    pub(super) async fn get_stdcm_path_items(
        &self,
        conn: &mut DbConnection,
        infra_id: i64,
    ) -> Result<Vec<STDCMPathItem>> {
        let locations: Vec<_> = self.steps.iter().map(|item| &item.location).collect();

        let path_item_cache = PathItemCache::load(conn, infra_id, &locations).await?;
        let track_offsets = path_item_cache
            .extract_location_from_path_items(&locations)
            .map_err(|path_res| match path_res {
                PathfindingResult::Failure(PathfindingFailure::PathfindingInputError(
                    PathfindingInputError::InvalidPathItems { items },
                )) => StdcmError::InvalidPathItems { items },
                _ => panic!("Unexpected pathfinding result"),
            })?;

        Ok(track_offsets
            .iter()
            .zip(&self.steps)
            .map(|(track_offset, path_item)| STDCMPathItem {
                stop_duration: path_item.duration,
                locations: track_offset.to_vec(),
                step_timing_data: path_item.timing_data.as_ref().map(|timing_data| {
                    STDCMStepTimingData {
                        arrival_time: timing_data.arrival_time,
                        arrival_time_tolerance_before: timing_data.arrival_time_tolerance_before,
                        arrival_time_tolerance_after: timing_data.arrival_time_tolerance_after,
                    }
                }),
            })
            .collect())
    }

    pub(super) async fn get_work_schedules(
        &self,
        conn: &mut DbConnection,
    ) -> Result<Vec<WorkSchedule>> {
        if self.work_schedule_group_id.is_none() {
            return Ok(vec![]);
        }

        let work_schedule_group_id = self.work_schedule_group_id.unwrap();
        let selection_setting = SelectionSettings::new()
            .filter(move || WorkSchedule::WORK_SCHEDULE_GROUP_ID.eq(work_schedule_group_id));
        WorkSchedule::list(conn, selection_setting).await
    }

    pub(super) async fn get_towed_rolling_stock(
        &self,
        conn: &mut DbConnection,
    ) -> Result<Option<TowedRollingStockModel>> {
        if self.towed_rolling_stock_id.is_none() {
            return Ok(None);
        }

        let towed_rolling_stock_id = self.towed_rolling_stock_id.unwrap();
        let towed_rolling_stock =
            TowedRollingStockModel::retrieve_or_fail(conn, towed_rolling_stock_id, || {
                StdcmError::TowedRollingStockNotFound {
                    towed_rolling_stock_id,
                }
            })
            .await?;
        Ok(Some(towed_rolling_stock))
    }
}
