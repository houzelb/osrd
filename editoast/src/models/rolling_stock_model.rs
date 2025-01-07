mod power_restrictions;

use std::collections::HashMap;

use diesel_json::Json;
use editoast_derive::Model;
use editoast_schemas::rolling_stock::EffortCurves;
use editoast_schemas::rolling_stock::EnergySource;
use editoast_schemas::rolling_stock::EtcsBrakeParams;
use editoast_schemas::rolling_stock::LoadingGaugeType;
use editoast_schemas::rolling_stock::RollingResistance;
use editoast_schemas::rolling_stock::RollingStock;
use editoast_schemas::rolling_stock::RollingStockMetadata;
use editoast_schemas::rolling_stock::RollingStockSupportedSignalingSystems;
use power_restrictions::PowerRestriction;
use serde::Deserialize;
use serde::Deserializer;
use serde::Serialize;
use utoipa::ToSchema;

use crate::models::prelude::*;

mod schedules_from_rolling_stock;
pub use schedules_from_rolling_stock::ScenarioReference;

editoast_common::schemas! {
    RollingStockModel,
    PowerRestriction,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Model, ToSchema)]
#[model(table = editoast_models::tables::rolling_stock)]
#[model(gen(ops = crud, batch_ops = r, list))]
#[model(changeset(public))]
#[schema(as = RollingStock)]
pub struct RollingStockModel {
    pub id: i64,
    pub railjson_version: String,
    #[model(identifier)]
    pub name: String,
    #[model(json)]
    pub effort_curves: EffortCurves,
    #[model(json)]
    #[schema(required)]
    pub metadata: Option<RollingStockMetadata>,
    pub length: f64,
    pub max_speed: f64,
    pub startup_time: f64,
    pub startup_acceleration: f64,
    pub comfort_acceleration: f64,
    pub const_gamma: f64,
    #[model(json)]
    #[schema(required)]
    pub etcs_brake_params: Option<EtcsBrakeParams>,
    pub inertia_coefficient: f64,
    #[schema(required)]
    pub base_power_class: Option<String>,
    pub mass: f64,
    #[model(json)]
    pub rolling_resistance: RollingResistance,
    #[model(to_enum)]
    pub loading_gauge: LoadingGaugeType,
    #[model(json)]
    pub power_restrictions: HashMap<String, String>,
    #[model(json)]
    pub energy_sources: Vec<EnergySource>,
    pub locked: bool,
    #[schema(required)]
    pub electrical_power_startup_time: Option<f64>,
    #[schema(required)]
    pub raise_pantograph_time: Option<f64>,
    pub version: i64,
    #[schema(value_type = Vec<String>)]
    #[model(remote = "Vec<Option<String>>")]
    pub supported_signaling_systems: RollingStockSupportedSignalingSystems,
}

impl<'de> Deserialize<'de> for RollingStockModelChangeset {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Inner {
            pub railjson_version: Option<String>,
            pub name: Option<String>,
            pub effort_curves: Option<Json<EffortCurves>>,
            pub metadata: Option<Json<Option<RollingStockMetadata>>>,
            pub length: Option<f64>,
            pub max_speed: Option<f64>,
            pub startup_time: Option<f64>,
            pub startup_acceleration: Option<f64>,
            pub comfort_acceleration: Option<f64>,
            pub const_gamma: Option<f64>,
            pub etcs_brake_params: Option<Json<Option<EtcsBrakeParams>>>,
            pub inertia_coefficient: Option<f64>,
            pub base_power_class: Option<Option<String>>,
            pub mass: Option<f64>,
            pub rolling_resistance: Option<Json<RollingResistance>>,
            pub loading_gauge: Option<i16>,
            pub power_restrictions: Option<Json<HashMap<String, String>>>,
            pub energy_sources: Option<Json<Vec<EnergySource>>>,
            pub locked: Option<bool>,
            pub electrical_power_startup_time: Option<Option<f64>>,
            pub raise_pantograph_time: Option<Option<f64>>,
            pub version: Option<i64>,
            pub supported_signaling_systems: Option<Vec<Option<String>>>,
        }

        let changeset = Inner::deserialize(deserializer)?;

        if changeset.effort_curves.is_none() {
            return Err(serde::de::Error::custom("effort_curves is required"));
        }

        validate_rolling_stock::<D>(
            changeset.effort_curves.as_ref().unwrap(),
            changeset.electrical_power_startup_time.flatten(),
            changeset.raise_pantograph_time.flatten(),
        )?;

        Ok(RollingStockModelChangeset {
            railjson_version: changeset.railjson_version,
            name: changeset.name,
            effort_curves: changeset.effort_curves,
            metadata: changeset.metadata,
            length: changeset.length,
            max_speed: changeset.max_speed,
            startup_time: changeset.startup_time,
            startup_acceleration: changeset.startup_acceleration,
            comfort_acceleration: changeset.comfort_acceleration,
            const_gamma: changeset.const_gamma,
            etcs_brake_params: changeset.etcs_brake_params,
            inertia_coefficient: changeset.inertia_coefficient,
            base_power_class: changeset.base_power_class,
            mass: changeset.mass,
            rolling_resistance: changeset.rolling_resistance,
            loading_gauge: changeset.loading_gauge,
            power_restrictions: changeset.power_restrictions,
            energy_sources: changeset.energy_sources,
            locked: changeset.locked,
            electrical_power_startup_time: changeset.electrical_power_startup_time,
            raise_pantograph_time: changeset.raise_pantograph_time,
            version: changeset.version,
            supported_signaling_systems: changeset.supported_signaling_systems,
        })
    }
}

pub fn validate_rolling_stock<'de, D>(
    effort_curves: &EffortCurves,
    electrical_power_startup_time: Option<f64>,
    raise_pantograph_time: Option<f64>,
) -> Result<(), D::Error>
where
    D: Deserializer<'de>,
{
    if !effort_curves.is_electric() {
        return Ok(());
    }
    if electrical_power_startup_time.is_none() {
        return Err(serde::de::Error::custom(
            "electrical_power_startup_time is required for electric rolling stocks",
        ));
    }
    if raise_pantograph_time.is_none() {
        return Err(serde::de::Error::custom(
            "raise_pantograph_time is required for electric rolling stocks",
        ));
    }
    Ok(())
}

impl From<RollingStockModel> for RollingStock {
    fn from(rolling_stock_model: RollingStockModel) -> Self {
        RollingStock {
            railjson_version: rolling_stock_model.railjson_version,
            locked: rolling_stock_model.locked,
            metadata: rolling_stock_model.metadata,
            name: rolling_stock_model.name,
            effort_curves: rolling_stock_model.effort_curves,
            base_power_class: rolling_stock_model.base_power_class,
            length: rolling_stock_model.length,
            max_speed: rolling_stock_model.max_speed,
            startup_time: rolling_stock_model.startup_time,
            startup_acceleration: rolling_stock_model.startup_acceleration,
            comfort_acceleration: rolling_stock_model.comfort_acceleration,
            const_gamma: rolling_stock_model.const_gamma,
            etcs_brake_params: rolling_stock_model.etcs_brake_params,
            inertia_coefficient: rolling_stock_model.inertia_coefficient,
            mass: rolling_stock_model.mass,
            rolling_resistance: rolling_stock_model.rolling_resistance,
            loading_gauge: rolling_stock_model.loading_gauge,
            power_restrictions: rolling_stock_model.power_restrictions,
            energy_sources: rolling_stock_model.energy_sources,
            electrical_power_startup_time: rolling_stock_model.electrical_power_startup_time,
            raise_pantograph_time: rolling_stock_model.raise_pantograph_time,
            supported_signaling_systems: rolling_stock_model.supported_signaling_systems,
        }
    }
}

impl From<RollingStock> for RollingStockModelChangeset {
    fn from(rolling_stock: RollingStock) -> Self {
        RollingStockModel::changeset()
            .railjson_version(rolling_stock.railjson_version)
            .locked(rolling_stock.locked)
            .metadata(rolling_stock.metadata)
            .name(rolling_stock.name)
            .effort_curves(rolling_stock.effort_curves)
            .base_power_class(rolling_stock.base_power_class)
            .length(rolling_stock.length)
            .max_speed(rolling_stock.max_speed)
            .startup_time(rolling_stock.startup_time)
            .startup_acceleration(rolling_stock.startup_acceleration)
            .comfort_acceleration(rolling_stock.comfort_acceleration)
            .const_gamma(rolling_stock.const_gamma)
            .etcs_brake_params(rolling_stock.etcs_brake_params)
            .inertia_coefficient(rolling_stock.inertia_coefficient)
            .mass(rolling_stock.mass)
            .rolling_resistance(rolling_stock.rolling_resistance)
            .loading_gauge(rolling_stock.loading_gauge)
            .power_restrictions(rolling_stock.power_restrictions)
            .energy_sources(rolling_stock.energy_sources)
            .electrical_power_startup_time(rolling_stock.electrical_power_startup_time)
            .raise_pantograph_time(rolling_stock.raise_pantograph_time)
            .supported_signaling_systems(rolling_stock.supported_signaling_systems)
    }
}

#[cfg(test)]
pub mod tests {
    use rstest::*;
    use serde_json::to_value;

    use super::RollingStockModel;
    use crate::error::InternalError;
    use crate::models::fixtures::create_fast_rolling_stock;
    use crate::models::fixtures::create_rolling_stock_with_energy_sources;
    use crate::models::fixtures::rolling_stock_with_energy_sources_changeset;
    use crate::models::prelude::*;
    use crate::views::rolling_stock::map_diesel_error;
    use crate::views::rolling_stock::RollingStockError;
    use editoast_models::DbConnectionPoolV2;

    #[rstest]
    async fn update_rolling_stock() {
        let db_pool = DbConnectionPoolV2::for_tests();
        let rs_name = "fast_rolling_stock_name";

        let created_fast_rolling_stock =
            create_fast_rolling_stock(&mut db_pool.get_ok(), rs_name).await;

        // GIVEN
        let rs_name_with_energy_sources_name = "other_rolling_stock_update_rolling_stock";
        let rolling_stock_id = created_fast_rolling_stock.id;

        let rolling_stock_with_energy_sources: Changeset<RollingStockModel> =
            rolling_stock_with_energy_sources_changeset(rs_name_with_energy_sources_name);

        // WHEN
        let updated_rolling_stock = rolling_stock_with_energy_sources
            .update(&mut db_pool.get_ok(), rolling_stock_id)
            .await
            .expect("Failed to update rolling stock")
            .unwrap();

        // THEN
        assert_eq!(updated_rolling_stock.name, rs_name_with_energy_sources_name);
    }

    #[rstest]
    async fn update_rolling_stock_failure_name_already_used() {
        let db_pool = DbConnectionPoolV2::for_tests();

        // GIVEN
        // Creating the first rolling stock
        let rs_name = "fast_rolling_stock_name";
        let created_fast_rolling_stock =
            create_fast_rolling_stock(&mut db_pool.get_ok(), rs_name).await;

        // Creating the second rolling stock
        let rs_name_with_energy_sources_name = "fast_rolling_stock_with_energy_sources_name";
        let created_fast_rolling_stock_with_energy_sources =
            create_rolling_stock_with_energy_sources(
                &mut db_pool.get_ok(),
                rs_name_with_energy_sources_name,
            )
            .await;

        // WHEN
        let result = created_fast_rolling_stock_with_energy_sources
            .into_changeset()
            .update(&mut db_pool.get_ok(), created_fast_rolling_stock.id)
            .await
            .map_err(|e| map_diesel_error(e, rs_name));

        let error: InternalError = RollingStockError::NameAlreadyUsed {
            name: String::from(rs_name),
        }
        .into();

        // THEN
        assert_eq!(
            to_value(result.unwrap_err()).unwrap(),
            to_value(error).unwrap()
        );
    }
}
