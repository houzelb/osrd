use chrono::DateTime;
use chrono::Utc;
use editoast_derive::Model;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::core::stdcm::Request;
use crate::core::stdcm::Response;

editoast_common::schemas! {
    StdcmLog,
}

#[derive(Clone, Debug, Serialize, Deserialize, Model, ToSchema)]
#[model(table = editoast_models::tables::stdcm_logs)]
#[model(gen(ops = c))]
pub struct StdcmLog {
    pub id: i64,
    pub trace_id: String,
    #[model(json)]
    pub request: Request,
    #[model(json)]
    pub response: Response,
    pub created: DateTime<Utc>,
    pub user_id: Option<i64>,
}
