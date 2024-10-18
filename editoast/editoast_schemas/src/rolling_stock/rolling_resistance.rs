use derivative::Derivative;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

editoast_common::schemas! {
    RollingResistance,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize, Serialize, ToSchema, Derivative)]
#[derivative(Hash)]
#[serde(deny_unknown_fields)]
#[allow(non_snake_case)]
pub struct RollingResistance {
    #[serde(rename = "type")]
    pub rolling_resistance_type: String,
    /// Solid friction in kN
    #[derivative(Hash(hash_with = "editoast_common::hash_float::<5,_>"))]
    pub A: f64,
    /// Viscosity friction in kN/(km/h)
    #[derivative(Hash(hash_with = "editoast_common::hash_float::<5,_>"))]
    pub B: f64,
    /// Aerodynamic drag in kN/(km/h)²
    #[derivative(Hash(hash_with = "editoast_common::hash_float::<5,_>"))]
    pub C: f64,
}
