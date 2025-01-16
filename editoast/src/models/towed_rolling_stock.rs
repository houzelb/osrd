use editoast_common::units::*;
use editoast_derive::Model;
use editoast_schemas::rolling_stock::RollingResistancePerWeight;
use editoast_schemas::rolling_stock::TowedRollingStock;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::models::prelude::*;

#[editoast_derive::annotate_units]
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Model, ToSchema)]
#[model(table = editoast_models::tables::towed_rolling_stock)]
#[model(gen(ops = crud, batch_ops = r, list))]
#[model(changeset(public))]
#[schema(as = TowedRollingStock)]
pub struct TowedRollingStockModel {
    pub id: i64,
    #[model(identifier)]
    pub name: String,
    pub label: String,
    pub railjson_version: String,
    pub locked: bool,

    #[serde(with = "kilogram")]
    #[model(uom_unit = "kilogram")]
    pub mass: Mass,
    #[serde(with = "meter")]
    #[model(uom_unit = "meter")]
    pub length: Length,
    #[schema(required)]
    #[serde(default, with = "meter_per_second::option")]
    #[model(uom_unit = "meter_per_second::option")]
    pub max_speed: Option<Velocity>,
    #[model(uom_unit = "meter_per_second_squared")]
    #[serde(with = "meter_per_second_squared")]
    pub comfort_acceleration: Acceleration,
    #[model(uom_unit = "meter_per_second_squared")]
    #[serde(with = "meter_per_second_squared")]
    pub startup_acceleration: Acceleration,
    #[model(uom_unit = "basis_point")]
    #[serde(with = "basis_point")]
    pub inertia_coefficient: Ratio,
    #[model(json)]
    pub rolling_resistance: RollingResistancePerWeight,
    #[model(uom_unit = "meter_per_second_squared")]
    #[serde(with = "meter_per_second_squared")]
    pub const_gamma: Deceleration,

    pub version: i64,
}

impl From<TowedRollingStockModel> for TowedRollingStock {
    fn from(model: TowedRollingStockModel) -> Self {
        Self {
            name: model.name,
            label: model.label,
            railjson_version: model.railjson_version,
            mass: model.mass,
            length: model.length,
            comfort_acceleration: model.comfort_acceleration,
            startup_acceleration: model.startup_acceleration,
            inertia_coefficient: model.inertia_coefficient,
            rolling_resistance: model.rolling_resistance,
            const_gamma: model.const_gamma,
            max_speed: model.max_speed,
        }
    }
}

impl From<TowedRollingStock> for Changeset<TowedRollingStockModel> {
    fn from(towed_rolling_stock: TowedRollingStock) -> Self {
        TowedRollingStockModel::changeset()
            .name(towed_rolling_stock.name)
            .label(towed_rolling_stock.label)
            .railjson_version(towed_rolling_stock.railjson_version)
            .mass(towed_rolling_stock.mass)
            .length(towed_rolling_stock.length)
            .comfort_acceleration(towed_rolling_stock.comfort_acceleration)
            .startup_acceleration(towed_rolling_stock.startup_acceleration)
            .inertia_coefficient(towed_rolling_stock.inertia_coefficient)
            .rolling_resistance(towed_rolling_stock.rolling_resistance)
            .const_gamma(towed_rolling_stock.const_gamma)
    }
}
