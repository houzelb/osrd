mod failure_handler;
mod request;

use axum::extract::Json;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::Extension;
use chrono::Utc;
use chrono::{DateTime, Duration};
use editoast_authz::BuiltinRole;
use editoast_derive::EditoastError;
use editoast_models::DbConnectionPoolV2;
use editoast_schemas::primitives::PositiveDuration;
use editoast_schemas::train_schedule::MarginValue;
use editoast_schemas::train_schedule::Margins;
use editoast_schemas::train_schedule::ReceptionSignal;
use editoast_schemas::train_schedule::ScheduleItem;
use failure_handler::SimulationFailureHandler;
use request::convert_steps;
use request::Request;
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use utoipa::IntoParams;
use utoipa::ToSchema;

use crate::core::conflict_detection::Conflict;
use crate::core::conflict_detection::TrainRequirements;
use crate::core::pathfinding::InvalidPathItem;
use crate::core::pathfinding::PathfindingResultSuccess;
use crate::core::simulation::PhysicsConsistParameters;
use crate::core::simulation::{RoutingRequirement, SimulationResponse, SpacingRequirement};
use crate::core::stdcm::STDCMRequest;
use crate::core::AsCoreRequest;
use crate::core::CoreClient;
use crate::error::Result;
use crate::models::timetable::TimetableWithTrains;
use crate::models::train_schedule::TrainSchedule;
use crate::models::Infra;
use crate::models::RollingStockModel;
use crate::views::path::pathfinding::PathfindingResult;
use crate::views::train_schedule::train_simulation;
use crate::views::train_schedule::train_simulation_batch;
use crate::views::AuthenticationExt;
use crate::views::AuthorizationError;
use crate::AppState;
use crate::Retrieve;
use crate::RetrieveBatch;
use crate::ValkeyClient;

editoast_common::schemas! {
    request::schemas(),
}

crate::routes! {
    "/stdcm" => stdcm,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, ToSchema)]
#[serde(tag = "status", rename_all = "snake_case")]
// We accepted the difference of memory size taken by variants
// Since there is only on success and others are error cases
#[allow(clippy::large_enum_variant)]
enum StdcmResponse {
    Success {
        simulation: SimulationResponse,
        path: PathfindingResultSuccess,
        departure_time: DateTime<Utc>,
    },
    Conflicts {
        pathfinding_result: PathfindingResult,
        conflicts: Vec<Conflict>,
    },
    PreprocessingSimulationError {
        error: SimulationResponse,
    },
}

#[derive(Debug, Error, EditoastError, Serialize)]
#[editoast_error(base_id = "stdcm_v2")]
enum StdcmError {
    #[error("Infrastrcture {infra_id} does not exist")]
    InfraNotFound { infra_id: i64 },
    #[error("Timetable {timetable_id} does not exist")]
    #[editoast_error(status = 404)]
    TimetableNotFound { timetable_id: i64 },
    #[error("Rolling stock {rolling_stock_id} does not exist")]
    RollingStockNotFound { rolling_stock_id: i64 },
    #[error("Towed rolling stock {towed_rolling_stock_id} does not exist")]
    TowedRollingStockNotFound { towed_rolling_stock_id: i64 },
    #[error("Path items are invalid")]
    InvalidPathItems { items: Vec<InvalidPathItem> },
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, IntoParams, ToSchema)]
struct InfraIdQueryParam {
    infra: i64,
}

/// This function computes a STDCM and returns the result.
/// It first checks user authorization, then retrieves timetable, infrastructure,
/// train schedules, and rolling stock data, and runs train simulations.
/// The result contains the simulation output based on the train schedules
/// and infrastructure provided.
///
/// If the simulation fails, the function uses a virtual train to detect conflicts
/// with existing train schedules. It then returns both the conflict information
/// and the pathfinding result from the virtual train's simulation.
#[utoipa::path(
    post, path = "",
    tag = "stdcm",
    request_body = inline(Request),
    params(("infra" = i64, Query, description = "The infra id"),
        ("id" = i64, Path, description = "timetable_id"),
    ),
    responses(
        (status = 201, body = inline(StdcmResponse), description = "The simulation result"),
    )
)]
async fn stdcm(
    app_state: State<AppState>,
    Extension(auth): AuthenticationExt,
    Path(id): Path<i64>,
    Query(query): Query<InfraIdQueryParam>,
    Json(stdcm_request): Json<Request>,
) -> Result<Json<StdcmResponse>> {
    let authorized = auth
        .check_roles([BuiltinRole::Stdcm].into())
        .await
        .map_err(AuthorizationError::AuthError)?;
    if !authorized {
        return Err(AuthorizationError::Unauthorized.into());
    }

    let db_pool = app_state.db_pool_v2.clone();
    let conn = &mut db_pool.get().await?;

    let valkey_client = app_state.valkey.clone();
    let core_client = app_state.core_client.clone();
    let timetable_id = id;
    let infra_id = query.infra;

    // 1. Retrieve Timetable / Infra / Trains / Simulation / Rolling Stock
    let timetable_trains = TimetableWithTrains::retrieve_or_fail(conn, timetable_id, || {
        StdcmError::TimetableNotFound { timetable_id }
    })
    .await?;

    let infra =
        Infra::retrieve_or_fail(conn, infra_id, || StdcmError::InfraNotFound { infra_id }).await?;

    let (train_schedules, _): (Vec<_>, _) =
        TrainSchedule::retrieve_batch(conn, timetable_trains.train_ids.clone()).await?;

    let rolling_stock =
        RollingStockModel::retrieve_or_fail(conn, stdcm_request.rolling_stock_id, || {
            StdcmError::RollingStockNotFound {
                rolling_stock_id: stdcm_request.rolling_stock_id,
            }
        })
        .await?;

    // 2. Compute the earliest start time and maximum departure delay
    let virtual_train_run = VirtualTrainRun::simulate(
        db_pool.clone(),
        valkey_client.clone(),
        core_client.clone(),
        &stdcm_request,
        &infra,
        &rolling_stock,
        timetable_id,
    )
    .await?;

    // Only the success variant of the simulation response contains the simulation run time.
    let Some(simulation_run_time) = virtual_train_run.simulation.simulation_run_time() else {
        return Ok(Json(StdcmResponse::PreprocessingSimulationError {
            error: virtual_train_run.simulation,
        }));
    };

    let earliest_departure_time = stdcm_request.get_earliest_departure_time(simulation_run_time);
    let latest_simulation_end = stdcm_request.get_latest_simulation_end(simulation_run_time);

    // 3. Get scheduled train requirements
    let simulations: Vec<_> = train_simulation_batch(
        conn,
        valkey_client.clone(),
        core_client.clone(),
        &train_schedules,
        &infra,
        stdcm_request.electrical_profile_set_id,
    )
    .await?
    .into_iter()
    .map(|(sim, _)| sim)
    .collect();

    let trains_requirements = build_train_requirements(
        train_schedules.clone(),
        simulations.clone(),
        earliest_departure_time,
        latest_simulation_end,
    );

    // 4. Retrieve work schedules
    let work_schedules = stdcm_request.get_work_schedules(conn).await?;

    // 5. Build STDCM request
    let stdcm_request = STDCMRequest {
        infra: infra.id,
        expected_version: infra.version.clone(),
        rolling_stock_loading_gauge: rolling_stock.loading_gauge,
        rolling_stock_supported_signaling_systems: rolling_stock
            .supported_signaling_systems
            .clone(),
        rolling_stock: PhysicsConsistParameters {
            max_speed: stdcm_request.max_speed,
            total_length: stdcm_request.total_length,
            total_mass: stdcm_request.total_mass,
            towed_rolling_stock: stdcm_request
                .get_towed_rolling_stock(conn)
                .await?
                .map(From::from),
            traction_engine: rolling_stock.into(),
        }
        .into(),
        temporary_speed_limits: stdcm_request
            .get_temporary_speed_limits(conn, simulation_run_time)
            .await?,
        comfort: stdcm_request.comfort,
        path_items: stdcm_request.get_stdcm_path_items(conn, infra_id).await?,
        start_time: earliest_departure_time,
        trains_requirements,
        maximum_departure_delay: stdcm_request.get_maximum_departure_delay(simulation_run_time),
        maximum_run_time: stdcm_request.get_maximum_run_time(simulation_run_time),
        speed_limit_tag: stdcm_request.speed_limit_tags,
        time_gap_before: stdcm_request.time_gap_before,
        time_gap_after: stdcm_request.time_gap_after,
        margin: stdcm_request.margin,
        time_step: Some(2000),
        work_schedules: work_schedules
            .iter()
            .filter_map(|ws| {
                ws.as_core_work_schedule(earliest_departure_time, latest_simulation_end)
            })
            .collect(),
    };

    let stdcm_response = stdcm_request.fetch(core_client.as_ref()).await?;

    // 6. Handle STDCM Core Response
    match stdcm_response {
        crate::core::stdcm::Response::Success {
            simulation,
            path,
            departure_time,
        } => Ok(Json(StdcmResponse::Success {
            simulation,
            path,
            departure_time,
        })),
        crate::core::stdcm::Response::PreprocessingSimulationError { error } => {
            Ok(Json(StdcmResponse::PreprocessingSimulationError { error }))
        }
        crate::core::stdcm::Response::PathNotFound => {
            let simulation_failure_handler = SimulationFailureHandler {
                core_client,
                infra_id,
                infra_version: infra.version,
                train_schedules,
                simulations,
                work_schedules,
                virtual_train_run,
                earliest_departure_time,
                latest_simulation_end,
            };
            let stdcm_response = simulation_failure_handler.compute_conflicts().await?;
            Ok(Json(stdcm_response))
        }
    }
}

/// Build the list of scheduled train requirements, only including requirements
/// that overlap with the possible simulation times.
fn build_train_requirements(
    train_schedules: Vec<TrainSchedule>,
    simulation_responses: Vec<SimulationResponse>,
    departure_time: DateTime<Utc>,
    latest_simulation_end: DateTime<Utc>,
) -> HashMap<i64, TrainRequirements> {
    let mut trains_requirements = HashMap::new();
    for (train, sim) in train_schedules.iter().zip(simulation_responses) {
        let final_output = match sim {
            SimulationResponse::Success { final_output, .. } => final_output,
            _ => continue,
        };

        // First check that the train overlaps with the simulation range
        let start_time = train.start_time;
        let train_duration_ms = *final_output.report_train.times.last().unwrap_or(&0);
        if !is_resource_in_range(
            departure_time,
            latest_simulation_end,
            start_time,
            0,
            train_duration_ms,
        ) {
            continue;
        }

        let spacing_requirements: Vec<SpacingRequirement> = final_output
            .spacing_requirements
            .into_iter()
            .filter(|req| {
                is_resource_in_range(
                    departure_time,
                    latest_simulation_end,
                    start_time,
                    req.begin_time,
                    req.end_time,
                )
            })
            .collect();
        let routing_requirements: Vec<RoutingRequirement> = final_output
            .routing_requirements
            .into_iter()
            .filter(|req| {
                is_resource_in_range(
                    departure_time,
                    latest_simulation_end,
                    start_time,
                    req.begin_time,
                    req.zones
                        .iter()
                        .map(|zone_req| zone_req.end_time)
                        .max()
                        .unwrap_or(req.begin_time),
                )
            })
            .collect();
        trains_requirements.insert(
            train.id,
            TrainRequirements {
                start_time,
                spacing_requirements,
                routing_requirements,
            },
        );
    }
    trains_requirements
}

/// Returns true if the resource use is at least partially in the simulation time range
fn is_resource_in_range(
    earliest_sim_time: DateTime<Utc>,
    latest_sim_time: DateTime<Utc>,
    train_start_time: DateTime<Utc>,
    resource_start_time: u64,
    resource_end_time: u64,
) -> bool {
    let abs_resource_start_time =
        train_start_time + Duration::milliseconds(resource_start_time as i64);
    let abs_resource_end_time = train_start_time + Duration::milliseconds(resource_end_time as i64);
    abs_resource_start_time <= latest_sim_time && abs_resource_end_time >= earliest_sim_time
}

struct VirtualTrainRun {
    train_schedule: TrainSchedule,
    simulation: SimulationResponse,
    pathfinding: PathfindingResult,
}

impl VirtualTrainRun {
    async fn simulate(
        db_pool: Arc<DbConnectionPoolV2>,
        valkey_client: Arc<ValkeyClient>,
        core_client: Arc<CoreClient>,
        stdcm_request: &Request,
        infra: &Infra,
        rolling_stock: &RollingStockModel,
        timetable_id: i64,
    ) -> Result<Self> {
        // Doesn't matter for now, but eventually it will affect tmp speed limits
        let approx_start_time = stdcm_request.get_earliest_step_time();

        let path = convert_steps(&stdcm_request.steps);
        let last_step = path.last().expect("empty step list");

        let train_schedule = TrainSchedule {
            id: 0,
            train_name: "".to_string(),
            labels: vec![],
            rolling_stock_name: rolling_stock.name.clone(),
            timetable_id,
            start_time: approx_start_time,
            schedule: vec![ScheduleItem {
                // Make the train stop at the end
                at: last_step.id.clone(),
                arrival: None,
                stop_for: Some(PositiveDuration::try_from(Duration::zero()).unwrap()),
                reception_signal: ReceptionSignal::Open,
                locked: false,
            }],
            margins: build_single_margin(stdcm_request.margin),
            initial_speed: 0.0,
            comfort: stdcm_request.comfort,
            path,
            constraint_distribution: Default::default(),
            speed_limit_tag: stdcm_request.speed_limit_tags.clone(),
            power_restrictions: vec![],
            options: Default::default(),
        };

        let (simulation, pathfinding) = train_simulation(
            &mut db_pool.get().await?,
            valkey_client,
            core_client,
            train_schedule.clone(),
            infra,
            None,
        )
        .await?;

        Ok(Self {
            train_schedule,
            simulation,
            pathfinding,
        })
    }
}

/// Build a margins object with one margin value covering the entire range
fn build_single_margin(margin: Option<MarginValue>) -> Margins {
    match margin {
        None => Margins {
            boundaries: vec![],
            values: vec![],
        },
        Some(m) => Margins {
            boundaries: vec![],
            values: vec![m],
        },
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use chrono::DateTime;
    use editoast_models::DbConnectionPoolV2;
    use editoast_schemas::rolling_stock::RollingResistance;
    use pretty_assertions::assert_eq;
    use rstest::rstest;
    use serde_json::json;
    use std::str::FromStr;
    use uuid::Uuid;

    use crate::core::conflict_detection::Conflict;
    use crate::core::conflict_detection::ConflictType;
    use crate::core::mocking::MockingClient;
    use crate::core::pathfinding::PathfindingResultSuccess;
    use crate::core::simulation::CompleteReportTrain;
    use crate::core::simulation::ElectricalProfiles;
    use crate::core::simulation::PhysicsConsist;
    use crate::core::simulation::ReportTrain;
    use crate::core::simulation::SimulationResponse;
    use crate::core::simulation::SpeedLimitProperties;
    use crate::models::fixtures::create_fast_rolling_stock;
    use crate::models::fixtures::create_simple_rolling_stock;
    use crate::models::fixtures::create_small_infra;
    use crate::models::fixtures::create_timetable;
    use crate::models::fixtures::create_towed_rolling_stock;
    use crate::views::test_app::TestAppBuilder;
    use crate::views::timetable::stdcm::PathfindingResult;

    use super::*;

    #[test]
    fn simulation_with_towed_rolling_stock_parameters() {
        let mut rolling_stock = create_simple_rolling_stock();
        rolling_stock.mass = 100000.0;
        rolling_stock.length = 20.0;
        rolling_stock.inertia_coefficient = 1.10; // m/s²
        rolling_stock.comfort_acceleration = 0.1;
        rolling_stock.startup_acceleration = 0.04; // m/s²
        rolling_stock.rolling_resistance = RollingResistance {
            rolling_resistance_type: "davis".to_string(),
            A: 1.0,
            B: 0.01,
            C: 0.0005,
        };

        let towed_rolling_stock = create_towed_rolling_stock();

        let total_mass = 200000.0;

        let simulation_parameters = PhysicsConsistParameters {
            total_length: None,
            max_speed: None,
            total_mass: Some(total_mass),
            towed_rolling_stock: Some(towed_rolling_stock.clone()),
            traction_engine: rolling_stock,
        };

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.mass, total_mass as u64);

        assert_eq!(physics_consist.inertia_coefficient, 1.075_f64);

        assert_eq!(
            physics_consist.rolling_resistance,
            RollingResistance {
                rolling_resistance_type: "davis".to_string(),
                A: 100001.0,
                B: 1000.01,
                C: 20.0005
            }
        );
    }

    #[test]
    fn simulation_with_parameters() {
        let simulation_parameters = PhysicsConsistParameters {
            total_mass: Some(123.0),
            total_length: Some(455.0),
            max_speed: Some(10.0), // m/s
            towed_rolling_stock: None,
            traction_engine: create_simple_rolling_stock(),
        };

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.mass, 123_u64);
        assert_eq!(physics_consist.length, 455000_u64); // It should be converted in mm
        assert_eq!(physics_consist.max_speed, 10_f64); // It should be in m/s
    }

    #[test]
    fn simulation_without_parameters() {
        let rolling_stock = create_simple_rolling_stock();
        let simulation_parameters = PhysicsConsistParameters::with_traction_engine(rolling_stock);

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.mass, 15000_u64);
        assert_eq!(physics_consist.length, 140000_u64); // It should be converted in mm
        assert_eq!(physics_consist.max_speed, 20_f64);
    }

    #[test]
    fn new_physics_rolling_stock_keeps_the_smallest_available_comfort_acceleration() {
        let mut rolling_stock = create_simple_rolling_stock();
        let mut towed_rolling_stock = create_towed_rolling_stock();
        rolling_stock.comfort_acceleration = 0.2;
        towed_rolling_stock.comfort_acceleration = 0.1;

        let mut simulation_parameters = PhysicsConsistParameters {
            max_speed: None,
            total_length: None,
            total_mass: None,
            towed_rolling_stock: Some(towed_rolling_stock.clone()),
            traction_engine: rolling_stock,
        };

        let physics_consist: PhysicsConsist = simulation_parameters.clone().into();

        assert_eq!(physics_consist.comfort_acceleration, 0.1);

        simulation_parameters.traction_engine.comfort_acceleration = 0.2;
        towed_rolling_stock.comfort_acceleration = 0.67;
        simulation_parameters.towed_rolling_stock = Some(towed_rolling_stock);

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.comfort_acceleration, 0.2);
    }

    #[test]
    fn new_physics_rolling_stock_keeps_the_biggest_available_startup_acceleration() {
        let mut simulation_parameters = PhysicsConsistParameters {
            max_speed: None,
            total_length: None,
            total_mass: None,
            towed_rolling_stock: Some(create_towed_rolling_stock()),
            traction_engine: create_simple_rolling_stock(),
        };

        simulation_parameters.traction_engine.startup_acceleration = 0.3;
        if let Some(trs) = simulation_parameters.towed_rolling_stock.as_mut() {
            trs.startup_acceleration = 0.45;
        }

        let physics_consist: PhysicsConsist = simulation_parameters.clone().into();

        assert_eq!(physics_consist.startup_acceleration, 0.45);

        if let Some(trs) = simulation_parameters.towed_rolling_stock.as_mut() {
            trs.startup_acceleration = 0.4;
        }
        simulation_parameters.traction_engine.startup_acceleration = 0.88;

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.startup_acceleration, 0.88);
    }

    #[test]
    fn new_physics_rolling_stock_keeps_the_smallest_available_max_speed() {
        let simulation_parameters = PhysicsConsistParameters {
            total_mass: None,
            total_length: None,
            max_speed: Some(30.0), // m/s
            towed_rolling_stock: None,
            traction_engine: create_simple_rolling_stock(),
        };

        let physics_consist: PhysicsConsist = simulation_parameters.into();

        assert_eq!(physics_consist.max_speed, 20_f64);
    }

    fn pathfinding_result_success() -> PathfindingResult {
        PathfindingResult::Success(PathfindingResultSuccess {
            blocks: vec![],
            routes: vec![],
            track_section_ranges: vec![],
            length: 0,
            path_item_positions: vec![0, 10],
        })
    }

    fn simulation_response() -> SimulationResponse {
        SimulationResponse::Success {
            base: ReportTrain {
                positions: vec![],
                times: vec![],
                speeds: vec![],
                energy_consumption: 0.0,
                path_item_times: vec![0, 10],
            },
            provisional: ReportTrain {
                positions: vec![],
                times: vec![0, 10],
                speeds: vec![],
                energy_consumption: 0.0,
                path_item_times: vec![0, 10],
            },
            final_output: CompleteReportTrain {
                report_train: ReportTrain {
                    positions: vec![],
                    times: vec![],
                    speeds: vec![],
                    energy_consumption: 0.0,
                    path_item_times: vec![0, 10],
                },
                signal_critical_positions: vec![],
                zone_updates: vec![],
                spacing_requirements: vec![],
                routing_requirements: vec![],
            },
            mrsp: SpeedLimitProperties {
                boundaries: vec![],
                values: vec![],
            },
            electrical_profiles: ElectricalProfiles {
                boundaries: vec![],
                values: vec![],
            },
        }
    }

    fn stdcm_payload(rolling_stock_id: i64) -> serde_json::Value {
        json!({
          "comfort": "STANDARD",
          "margin": "4.5min/100km",
          "rolling_stock_id": rolling_stock_id,
          "speed_limit_tags": "AR120",
          "steps": [
            {
              "duration": 0,
              "location": { "trigram": "WS", "secondary_code": "BV" },
              "timing_data": {
                "arrival_time": "2024-09-17T20:05:00+02:00",
                "arrival_time_tolerance_before": 0,
                "arrival_time_tolerance_after": 0
              }
            },
            { "duration": 0, "location": { "trigram": "MWS", "secondary_code": "BV" } }
          ],
          "time_gap_after": 35000,
          "time_gap_before": 35000
        })
    }

    fn core_mocking_client() -> MockingClient {
        let mut core = MockingClient::new();
        core.stub("/v2/pathfinding/blocks")
            .method(reqwest::Method::POST)
            .response(StatusCode::OK)
            .json(pathfinding_result_success())
            .finish();
        core.stub("/v2/standalone_simulation")
            .method(reqwest::Method::POST)
            .response(StatusCode::OK)
            .json(serde_json::to_value(simulation_response()).unwrap())
            .finish();
        core
    }

    fn conflict_data() -> Conflict {
        Conflict {
            train_ids: vec![0, 1],
            work_schedule_ids: vec![],
            start_time: DateTime::from_str("2024-01-01T00:00:00Z")
                .expect("Failed to parse datetime"),
            end_time: DateTime::from_str("2024-01-02T00:00:00Z").expect("Failed to parse datetime"),
            conflict_type: ConflictType::Spacing,
            requirements: vec![],
        }
    }

    #[rstest]
    async fn stdcm_return_success() {
        let db_pool = DbConnectionPoolV2::for_tests();
        let mut core = core_mocking_client();
        core.stub("/v2/stdcm")
            .method(reqwest::Method::POST)
            .response(StatusCode::OK)
            .json(json!({
                "status": "success",
                "simulation": serde_json::to_value(simulation_response()).unwrap(),
                "path": serde_json::to_value(pathfinding_result_success()).unwrap(),
                "departure_time": "2024-01-02T00:00:00Z"
            }))
            .finish();

        let app = TestAppBuilder::new()
            .db_pool(db_pool.clone())
            .core_client(core.into())
            .build();
        let small_infra = create_small_infra(&mut db_pool.get_ok()).await;
        let timetable = create_timetable(&mut db_pool.get_ok()).await;
        let rolling_stock =
            create_fast_rolling_stock(&mut db_pool.get_ok(), &Uuid::new_v4().to_string()).await;

        let request = app
            .post(format!("/timetable/{}/stdcm?infra={}", timetable.id, small_infra.id).as_str())
            .json(&stdcm_payload(rolling_stock.id));

        let stdcm_response: StdcmResponse =
            app.fetch(request).assert_status(StatusCode::OK).json_into();

        if let PathfindingResult::Success(path) = pathfinding_result_success() {
            assert_eq!(
                stdcm_response,
                StdcmResponse::Success {
                    simulation: simulation_response(),
                    path,
                    departure_time: DateTime::from_str("2024-01-02T00:00:00Z")
                        .expect("Failed to parse datetime")
                }
            );
        }
    }

    #[rstest]
    async fn stdcm_return_conflicts() {
        let db_pool = DbConnectionPoolV2::for_tests();
        let mut core = core_mocking_client();
        core.stub("/v2/stdcm")
            .method(reqwest::Method::POST)
            .response(StatusCode::OK)
            .json(json!({"status": "path_not_found"}))
            .finish();
        core.stub("/v2/conflict_detection")
            .method(reqwest::Method::POST)
            .response(StatusCode::OK)
            .json(json!({"conflicts": [
                serde_json::to_value(conflict_data()).unwrap()
            ]}))
            .finish();

        let app = TestAppBuilder::new()
            .db_pool(db_pool.clone())
            .core_client(core.into())
            .build();
        let small_infra = create_small_infra(&mut db_pool.get_ok()).await;
        let timetable = create_timetable(&mut db_pool.get_ok()).await;
        let rolling_stock =
            create_fast_rolling_stock(&mut db_pool.get_ok(), &Uuid::new_v4().to_string()).await;

        let request = app
            .post(format!("/timetable/{}/stdcm?infra={}", timetable.id, small_infra.id).as_str())
            .json(&stdcm_payload(rolling_stock.id));

        let stdcm_response: StdcmResponse =
            app.fetch(request).assert_status(StatusCode::OK).json_into();

        let mut conflict = conflict_data();
        conflict.train_ids = vec![1];

        assert_eq!(
            stdcm_response,
            StdcmResponse::Conflicts {
                pathfinding_result: pathfinding_result_success(),
                conflicts: vec![conflict],
            }
        );
    }

    #[rstest]
    // A day before the 'start_time' -> FILTERED OUT
    #[case("2024-03-13 06:00:00Z", "2024-03-13 12:00:00Z", true)]
    // Finishing just after the 'start_time' -> KEPT
    #[case("2024-03-14 06:00:00Z", "2024-03-14 08:01:00Z", false)]
    // Starting after the 'latest_simulation_end' -> FILTERED OUT
    #[case("2024-03-14 10:01:00Z", "2024-03-14 12:00:00Z", true)]
    // Starting before the 'latest_simulation_end' -> KEPT
    #[case("2024-03-14 09:59:00Z", "2024-03-14 12:00:00Z", false)]
    // Starting before the 'start_time' and finishing after 'latest_simulation_end' -> KEPT
    #[case("2024-03-14 06:00:00Z", "2024-03-14 12:00:00Z", false)]
    // Starting after the 'start_time' and finishing before 'latest_simulation_end' -> KEPT
    #[case("2024-03-14 08:30:00Z", "2024-03-14 09:30:00Z", false)]
    fn filter_stdcm_work_schedules_with_window(
        #[case] ws_start_time: &str,
        #[case] ws_end_time: &str,
        #[case] filtered_out: bool,
    ) {
        // GIVEN

        use crate::models::work_schedules::WorkSchedule;
        let work_schedules = [WorkSchedule {
            id: rand::random::<i64>(),
            start_date_time: DateTime::parse_from_rfc3339(ws_start_time)
                .unwrap()
                .to_utc(),
            end_date_time: DateTime::parse_from_rfc3339(ws_end_time).unwrap().to_utc(),
            ..Default::default()
        }];
        let start_time = DateTime::parse_from_rfc3339("2024-03-14T08:00:00Z")
            .unwrap()
            .to_utc();
        let latest_simulation_end = DateTime::parse_from_rfc3339("2024-03-14T10:00:00Z")
            .unwrap()
            .to_utc();

        // WHEN
        let filtered: Vec<_> = work_schedules
            .iter()
            .filter_map(|ws| ws.as_core_work_schedule(start_time, latest_simulation_end))
            .collect();

        // THEN
        assert!(filtered.is_empty() == filtered_out);
    }
}
