use chrono::DateTime;
use chrono::Utc;
use editoast_derive::Model;
use editoast_models::DbConnection;
use opentelemetry::trace::TraceContextExt;
use serde::Deserialize;
use serde::Serialize;
use tracing_opentelemetry::OpenTelemetrySpanExt;
use utoipa::ToSchema;

use crate::core::stdcm::Request;
use crate::core::stdcm::Response;
use crate::models::prelude::*;

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

impl StdcmLog {
    pub async fn log(
        mut conn: DbConnection,
        request: Request,
        response: Response,
        user_id: Option<i64>,
    ) {
        let trace_id = tracing::Span::current()
            .context()
            .span()
            .span_context()
            .trace_id();
        let stdcm_log_changeset = StdcmLog::changeset()
            .trace_id(trace_id.to_string())
            .request(request)
            .response(response.clone())
            .user_id(user_id);
        if let Err(e) = stdcm_log_changeset.create(&mut conn).await {
            tracing::error!("Failed during log operation: {e}");
        }
    }
}
