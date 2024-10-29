use std::cmp::max;

use chrono::DateTime;
use chrono::NaiveDateTime;
use chrono::TimeZone;
use chrono::Utc;
use editoast_derive::Model;
use editoast_schemas::infra::TrackRange;
use strum::FromRepr;

use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::core::stdcm::UndirectedTrackRange;

#[derive(Debug, Clone, Model)]
#[model(table = editoast_models::tables::work_schedule_group)]
#[model(gen(ops = crd, batch_ops = c, list))]
pub struct WorkScheduleGroup {
    pub id: i64,
    pub creation_date: NaiveDateTime,
    pub name: String,
}

#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize, FromRepr, ToSchema, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum WorkScheduleType {
    #[default]
    Catenary,
    Track,
}

#[derive(Debug, Default, Clone, Model)]
#[model(table = editoast_models::tables::work_schedule)]
#[model(gen(batch_ops = c, list))]
pub struct WorkSchedule {
    pub id: i64,
    pub start_date_time: NaiveDateTime,
    pub end_date_time: NaiveDateTime,
    #[model(json)]
    pub track_ranges: Vec<TrackRange>,
    pub obj_id: String,
    #[model(to_enum)]
    pub work_schedule_type: WorkScheduleType,
    pub work_schedule_group_id: i64,
}

impl WorkSchedule {
    pub fn map_to_core_work_schedule(
        &self,
        start_time: DateTime<Utc>,
    ) -> crate::core::stdcm::WorkSchedule {
        crate::core::stdcm::WorkSchedule {
            start_time: elapsed_since_time_ms(&self.start_date_time, &start_time),
            end_time: elapsed_since_time_ms(&self.end_date_time, &start_time),
            track_ranges: self
                .track_ranges
                .iter()
                .map(|track| UndirectedTrackRange {
                    track_section: track.track.to_string(),
                    begin: (track.begin * 1000.0) as u64,
                    end: (track.end * 1000.0) as u64,
                })
                .collect(),
        }
    }

    pub fn make_stdcm_work_schedule(
        &self,
        start_time: DateTime<Utc>,
        latest_simulation_end: DateTime<Utc>,
    ) -> Option<crate::core::stdcm::WorkSchedule> {
        let search_window_duration = (latest_simulation_end - start_time).num_milliseconds() as u64;

        let ws = self.map_to_core_work_schedule(start_time);
        if ws.end_time > 0 && ws.start_time < search_window_duration {
            return Some(ws);
        }
        None
    }
}

fn elapsed_since_time_ms(time: &NaiveDateTime, start_time: &DateTime<Utc>) -> u64 {
    max(
        0,
        (Utc.from_utc_datetime(time) - start_time).num_milliseconds(),
    ) as u64
}
