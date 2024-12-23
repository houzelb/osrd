use derivative::Derivative;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

editoast_common::schemas! {
    TrainScheduleOptions,
}

#[derive(Debug, Derivative, Clone, Serialize, Deserialize, ToSchema, Hash)]
#[serde(deny_unknown_fields)]
#[derivative(Default)]
pub struct TrainScheduleOptions {
    #[derivative(Default(value = "true"))]
    #[serde(default = "default_use_electrical_profiles")]
    use_electrical_profiles: bool,

    #[derivative(Default(value = "true"))]
    #[serde(default = "default_stop_at_next_signal")] // TODO: try to set default value only at 1 location (struct)
    stop_at_next_signal: bool,
}

fn default_use_electrical_profiles() -> bool {
    true
}

fn default_stop_at_next_signal() -> bool {
    true
}

impl TrainScheduleOptions {
    pub fn stops_at_next_signal(&self) -> bool {
        self.stop_at_next_signal
    }
}
