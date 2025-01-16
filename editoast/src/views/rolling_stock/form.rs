use std::collections::HashMap;

use editoast_schemas::rolling_stock::EffortCurves;
use editoast_schemas::rolling_stock::EnergySource;
use editoast_schemas::rolling_stock::EtcsBrakeParams;
use editoast_schemas::rolling_stock::LoadingGaugeType;
use editoast_schemas::rolling_stock::RollingResistance;
use editoast_schemas::rolling_stock::RollingStockMetadata;
use editoast_schemas::rolling_stock::RollingStockSupportedSignalingSystems;
use editoast_schemas::rolling_stock::ROLLING_STOCK_RAILJSON_VERSION;
use serde::Deserialize;
use serde::Serialize;
use serde_with::rust::double_option;
use utoipa::ToSchema;
use validator::Validate;
use validator::ValidationError;

use crate::models::rolling_stock_model::validate_rolling_stock;
use crate::models::Changeset;
use crate::models::Model;
use crate::models::RollingStockModel;

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema, Validate)]
#[validate(schema(function = "validate_rolling_stock_form"))]
pub struct RollingStockForm {
    pub name: String,
    pub effort_curves: Option<EffortCurves>,
    #[schema(example = "5", required)]
    #[serde(default, with = "double_option")]
    pub base_power_class: Option<Option<String>>,
    pub length: Option<f64>,
    pub max_speed: Option<f64>,
    pub startup_time: Option<f64>,
    pub startup_acceleration: Option<f64>,
    pub comfort_acceleration: Option<f64>,
    pub const_gamma: Option<f64>,
    pub inertia_coefficient: Option<f64>,
    pub mass: Option<f64>,
    pub rolling_resistance: Option<RollingResistance>,
    pub loading_gauge: Option<LoadingGaugeType>,
    /// Mapping of power restriction code to power class
    #[serde(default)]
    #[schema(required)]
    pub power_restrictions: Option<HashMap<String, String>>,
    #[serde(default)]
    pub energy_sources: Option<Vec<EnergySource>>,
    /// The time the train takes before actually using electrical power (in seconds). Is null if the train is not electric.
    #[schema(example = 5.0)]
    #[serde(default, with = "double_option")]
    pub electrical_power_startup_time: Option<Option<f64>>,
    #[serde(default, with = "double_option")]
    pub etcs_brake_params: Option<Option<EtcsBrakeParams>>,
    /// The time it takes to raise this train's pantograph in seconds. Is null if the train is not electric.
    #[schema(example = 15.0)]
    #[serde(default, with = "double_option")]
    pub raise_pantograph_time: Option<Option<f64>>,
    pub supported_signaling_systems: Option<RollingStockSupportedSignalingSystems>,
    pub locked: Option<bool>,
    #[serde(default, with = "double_option")]
    pub metadata: Option<Option<RollingStockMetadata>>,
}

impl From<RollingStockForm> for Changeset<RollingStockModel> {
    fn from(rolling_stock: RollingStockForm) -> Self {
        RollingStockModel::changeset()
            .railjson_version(ROLLING_STOCK_RAILJSON_VERSION.to_string())
            .flat_locked(rolling_stock.locked)
            .flat_metadata(rolling_stock.metadata)
            .name(rolling_stock.name)
            .flat_effort_curves(rolling_stock.effort_curves)
            .flat_base_power_class(rolling_stock.base_power_class)
            .flat_length(rolling_stock.length)
            .flat_max_speed(rolling_stock.max_speed)
            .flat_startup_time(rolling_stock.startup_time)
            .flat_startup_acceleration(rolling_stock.startup_acceleration)
            .flat_comfort_acceleration(rolling_stock.comfort_acceleration)
            .flat_const_gamma(rolling_stock.const_gamma)
            .flat_etcs_brake_params(rolling_stock.etcs_brake_params)
            .flat_inertia_coefficient(rolling_stock.inertia_coefficient)
            .flat_mass(rolling_stock.mass)
            .flat_rolling_resistance(rolling_stock.rolling_resistance)
            .flat_loading_gauge(rolling_stock.loading_gauge)
            .flat_power_restrictions(rolling_stock.power_restrictions)
            .flat_energy_sources(rolling_stock.energy_sources)
            .flat_electrical_power_startup_time(rolling_stock.electrical_power_startup_time)
            .flat_raise_pantograph_time(rolling_stock.raise_pantograph_time)
            .flat_supported_signaling_systems(rolling_stock.supported_signaling_systems)
    }
}

fn validate_rolling_stock_form(
    rolling_stock_form: &RollingStockForm,
) -> std::result::Result<(), ValidationError> {
    match (
        &rolling_stock_form.effort_curves,
        rolling_stock_form.electrical_power_startup_time,
        rolling_stock_form.raise_pantograph_time,
    ) {
        (Some(effort_curves), Some(electrical_power_startup_time), Some(raise_pantograph_time)) => {
            validate_rolling_stock(
                effort_curves,
                electrical_power_startup_time,
                raise_pantograph_time,
            )
        }
        // No need to update any of the three, so no to check for a coherency problem
        (None, None, None) => Ok(()),
        _ => Err(ValidationError::new("updating electrical information must be done on all 3 fields together: 'effort_curves', 'electrical_power_startup_time' and 'raise_pantograph_time'.")),
    }
}

// Used in some tests where we import a rolling stock as a fixture
#[cfg(test)]
impl From<RollingStockModel> for RollingStockForm {
    fn from(value: RollingStockModel) -> Self {
        RollingStockForm {
            name: value.name,
            effort_curves: Some(value.effort_curves),
            base_power_class: Some(value.base_power_class),
            length: Some(value.length),
            max_speed: Some(value.max_speed),
            startup_time: Some(value.startup_time),
            startup_acceleration: Some(value.startup_acceleration),
            comfort_acceleration: Some(value.comfort_acceleration),
            const_gamma: Some(value.const_gamma),
            etcs_brake_params: Some(value.etcs_brake_params),
            inertia_coefficient: Some(value.inertia_coefficient),
            mass: Some(value.mass),
            rolling_resistance: Some(value.rolling_resistance),
            loading_gauge: Some(value.loading_gauge),
            power_restrictions: Some(value.power_restrictions),
            energy_sources: Some(value.energy_sources),
            electrical_power_startup_time: Some(value.electrical_power_startup_time),
            raise_pantograph_time: Some(value.raise_pantograph_time),
            supported_signaling_systems: Some(value.supported_signaling_systems),
            locked: Some(value.locked),
            metadata: Some(value.metadata),
        }
    }
}
