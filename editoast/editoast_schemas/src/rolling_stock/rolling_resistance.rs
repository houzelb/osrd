use derivative::Derivative;
use editoast_common::units;
use editoast_common::units::quantities::{
    AerodynamicDrag, AerodynamicDragPerWeight, SolidFriction, SolidFrictionPerWeight,
    ViscosityFriction, ViscosityFrictionPerWeight,
};
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

editoast_common::schemas! {
    RollingResistance,
    RollingResistancePerWeight,
}

#[editoast_derive::annotate_units]
#[derive(Clone, Debug, Default, PartialEq, Deserialize, Serialize, ToSchema, Derivative)]
#[derivative(Hash)]
#[serde(deny_unknown_fields)]
#[allow(non_snake_case)]
pub struct RollingResistance {
    #[serde(rename = "type")]
    pub rolling_resistance_type: String,
    /// Solid friction
    #[derivative(Hash(hash_with = "units::newton::hash"))]
    #[serde(with = "units::newton")]
    pub A: SolidFriction,
    /// Viscosity friction in N·(m/s)⁻¹; N = kg⋅m⋅s⁻²
    #[derivative(Hash(hash_with = "units::kilogram_per_second::hash"))]
    #[serde(with = "units::kilogram_per_second")]
    pub B: ViscosityFriction,
    /// Aerodynamic drag in N·(m/s)⁻²; N = kg⋅m⋅s⁻²
    #[derivative(Hash(hash_with = "units::kilogram_per_meter::hash"))]
    #[serde(with = "units::kilogram_per_meter")]
    pub C: AerodynamicDrag,
}

#[editoast_derive::annotate_units]
#[derive(Clone, Debug, Default, PartialEq, Deserialize, Serialize, ToSchema, Derivative)]
#[derivative(Hash)]
#[serde(deny_unknown_fields)]
#[allow(non_snake_case)]
pub struct RollingResistancePerWeight {
    #[serde(rename = "type")]
    pub rolling_resistance_type: String,
    /// Solid friction in N·kg⁻¹; N = kg⋅m⋅s⁻²
    #[derivative(Hash(hash_with = "units::meter_per_second_squared::hash"))]
    #[serde(with = "units::meter_per_second_squared")]
    pub A: SolidFrictionPerWeight,
    /// Viscosity friction in (N·kg⁻¹)·(m/s)⁻¹; N = kg⋅m⋅s⁻²
    #[derivative(Hash(hash_with = "units::hertz::hash"))]
    #[serde(with = "units::hertz")]
    pub B: ViscosityFrictionPerWeight,
    /// Aerodynamic drag per kg in (N·kg⁻¹)·(m/s)⁻²; N = kg⋅m⋅s⁻²
    #[derivative(Hash(hash_with = "units::per_meter::hash"))]
    #[serde(with = "units::per_meter")]
    pub C: AerodynamicDragPerWeight,
}
