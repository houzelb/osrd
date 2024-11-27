use super::RollingResistancePerWeight;

#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct TowedRollingStock {
    pub name: String,
    pub label: String,
    pub railjson_version: String,
    /// In kg
    pub mass: f64,
    /// In m
    pub length: f64,
    /// In m/s²
    pub comfort_acceleration: f64,
    /// In m/s²
    pub startup_acceleration: f64,
    pub inertia_coefficient: f64,
    pub rolling_resistance: RollingResistancePerWeight,
    /// The constant gamma braking coefficient used when NOT circulating
    /// under ETCS/ERTMS signaling system in m/s^2
    pub const_gamma: f64,
}
