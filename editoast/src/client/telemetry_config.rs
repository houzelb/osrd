use clap::Args;
use clap::ValueEnum;
use derivative::Derivative;
use url::Url;

#[derive(Args, Debug, Derivative, Clone)]
#[derivative(Default)]
pub struct TelemetryConfig {
    #[derivative(Default(value = "TelemetryKind::None"))]
    #[clap(long, env, default_value_t)]
    pub telemetry_kind: TelemetryKind,
    #[derivative(Default(value = r#""osrd-editoast".into()"#))]
    #[clap(long, env, default_value = "osrd-editoast")]
    pub service_name: String,
    #[derivative(Default(value = r#"Url::parse("http://localhost:4317").unwrap()"#))]
    #[arg(long, env, default_value = "http://localhost:4317")]
    pub telemetry_endpoint: Url,
}

impl From<TelemetryConfig> for editoast_common::tracing::Telemetry {
    fn from(telemetry_config: TelemetryConfig) -> Self {
        Self {
            service_name: telemetry_config.service_name,
            endpoint: telemetry_config.telemetry_endpoint,
        }
    }
}

#[derive(Default, ValueEnum, Debug, Derivative, Clone, strum::Display)]
#[strum(serialize_all = "lowercase")]
pub enum TelemetryKind {
    #[default]
    None,
    Opentelemetry,
}
