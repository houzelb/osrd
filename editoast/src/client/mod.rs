pub mod electrical_profiles_commands;
pub mod healthcheck;
pub mod import_rolling_stock;
pub mod infra_commands;
mod postgres_config;
pub mod roles;
pub mod runserver;
pub mod search_commands;
pub mod stdcm_search_env_commands;
mod telemetry_config;
pub mod timetables_commands;
mod valkey_config;

use std::env;
use std::path::PathBuf;

use clap::Args;
use clap::Parser;
use clap::Subcommand;
use clap::ValueEnum;
use derivative::Derivative;
use editoast_derive::EditoastError;
use import_rolling_stock::ImportRollingStockArgs;
use infra_commands::InfraCommands;
pub use postgres_config::PostgresConfig;
use roles::RolesCommand;
use runserver::CoreArgs;
use runserver::RunserverArgs;
use search_commands::SearchCommands;
use stdcm_search_env_commands::StdcmSearchEnvCommands;
pub use telemetry_config::TelemetryConfig;
pub use telemetry_config::TelemetryKind;
use thiserror::Error;
use timetables_commands::TimetablesCommands;
use url::Url;
pub use valkey_config::ValkeyConfig;

use crate::error::Result;
use crate::views::OpenApiRoot;

#[derive(Parser, Debug)]
#[command(author, version)]
pub struct Client {
    #[command(flatten)]
    pub postgres_config: PostgresConfig,
    #[command(flatten)]
    pub valkey_config: ValkeyConfig,
    #[command(flatten)]
    pub telemetry_config: TelemetryConfig,
    #[arg(long, env, value_enum, default_value_t = Color::Auto)]
    pub color: Color,
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(ValueEnum, Debug, Derivative, Clone)]
#[derivative(Default)]
pub enum Color {
    Never,
    Always,
    #[derivative(Default)]
    Auto,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Runserver(RunserverArgs),
    #[command(
        subcommand,
        about,
        long_about = "Commands related to electrical profile sets"
    )]
    ElectricalProfiles(electrical_profiles_commands::ElectricalProfilesCommands),
    ImportRollingStock(ImportRollingStockArgs),
    ImportTowedRollingStock(ImportRollingStockArgs),
    OsmToRailjson(OsmToRailjsonArgs),
    #[command(about, long_about = "Prints the OpenApi of the service")]
    Openapi,
    #[command(subcommand, about, long_about = "Search engine related commands")]
    Search(SearchCommands),
    #[command(subcommand, about, long_about = "Infrastructure related commands")]
    Infra(InfraCommands),
    #[command(subcommand, about, long_about = "Timetables related commands")]
    Timetables(TimetablesCommands),
    #[command(
        subcommand,
        about,
        long_about = "STDCM search environment management commands"
    )]
    STDCMSearchEnv(StdcmSearchEnvCommands),
    #[command(subcommand, about, long_about = "Roles related commands")]
    Roles(RolesCommand),
    #[command(about, long_about = "Healthcheck")]
    Healthcheck(CoreArgs),
}

#[derive(Args, Debug)]
#[command(about, long_about = "Extracts a railjson from OpenStreetMap data")]
pub struct OsmToRailjsonArgs {
    /// Input file in the OSM PBF format
    pub osm_pbf_in: PathBuf,
    /// Output file in Railjson format
    pub railjson_out: PathBuf,
}

/// Prints the OpenApi to stdout
pub fn print_openapi() {
    let openapi = OpenApiRoot::build_openapi();
    print!("{}", serde_yaml::to_string(&openapi).unwrap());
}

/// Retrieve the ROOT_URL env var. If not found returns default local url.
pub fn get_root_url() -> Result<Url> {
    let url = env::var("ROOT_URL").unwrap_or(String::from("http://localhost:8090"));
    let parsed_url = Url::parse(&url).map_err(|_| EditoastUrlError::InvalidUrl { url })?;
    Ok(parsed_url)
}

/// Retrieve the app version (git describe)
pub fn get_app_version() -> Option<String> {
    env::var("OSRD_GIT_DESCRIBE").ok()
}

/// Retrieve the assets path
pub fn get_dynamic_assets_path() -> PathBuf {
    env::var("DYNAMIC_ASSETS_PATH")
        .unwrap_or(String::from("./assets"))
        .into()
}

#[derive(Debug, Error, EditoastError)]
#[editoast_error(base_id = "url")]
pub enum EditoastUrlError {
    #[error("Invalid url '{url}'")]
    #[editoast_error(status = 500)]
    InvalidUrl { url: String },
}

#[cfg(test)]
pub fn generate_temp_file<T: serde::Serialize>(object: &T) -> tempfile::NamedTempFile {
    use std::io::Write as _;
    let mut tmp_file = tempfile::NamedTempFile::new().unwrap();
    write!(tmp_file, "{}", serde_json::to_string(object).unwrap()).unwrap();
    tmp_file
}
