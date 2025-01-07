use super::RollingResistancePerWeight;
use editoast_common::units::*;

#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct TowedRollingStock {
    pub name: String,
    pub label: String,
    pub railjson_version: String,
    #[serde(with = "kilogram")]
    pub mass: Mass,
    #[serde(with = "meter")]
    pub length: Length,
    #[serde(with = "meter_per_second_squared")]
    pub comfort_acceleration: Acceleration,
    #[serde(with = "meter_per_second_squared")]
    pub startup_acceleration: Acceleration,
    #[serde(with = "basis_point")]
    pub inertia_coefficient: Ratio,
    pub rolling_resistance: RollingResistancePerWeight,
    /// The constant gamma braking coefficient used when NOT circulating
    /// under ETCS/ERTMS signaling system
    #[serde(with = "meter_per_second_squared")]
    pub const_gamma: Deceleration,
    #[serde(default, with = "meter_per_second::option")]
    pub max_speed: Option<Velocity>,
}
