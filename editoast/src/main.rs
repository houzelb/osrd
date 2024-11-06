#[macro_use]
extern crate diesel;

mod client;
mod core;
mod error;
mod generated_data;
mod infra_cache;
mod map;
mod models;
mod valkey_utils;
mod views;

use clap::Parser;
use client::electrical_profiles_commands::*;
use client::healthcheck::healthcheck_cmd;
use client::import_rolling_stock::*;
use client::infra_commands::*;
use client::print_openapi;
use client::roles;
use client::roles::RolesCommand;
use client::runserver::runserver;
use client::search_commands::*;
use client::stdcm_search_env_commands::handle_stdcm_search_env_command;
use client::timetables_commands::*;
use client::Client;
use client::Color;
use client::Commands;
use editoast_models::DbConnectionPoolV2;
use models::RollingStockModel;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::resource::EnvResourceDetector;
use opentelemetry_sdk::resource::SdkProvidedResourceDetector;
use opentelemetry_sdk::resource::TelemetryResourceDetector;
pub use views::AppState;

use models::prelude::*;
use opentelemetry::KeyValue;
use opentelemetry_otlp::WithExportConfig as _;
use opentelemetry_sdk::Resource;
use std::error::Error;
use std::io::IsTerminal;
use std::process::exit;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tracing::error;
use tracing_subscriber::layer::SubscriberExt as _;
use tracing_subscriber::util::SubscriberInitExt as _;
use tracing_subscriber::Layer as _;
pub use valkey_utils::ValkeyClient;
pub use valkey_utils::ValkeyConnection;

/// The mode editoast is running in
///
/// This is used to determine the logging output. For a CLI command, it's better to
/// log to stderr in order to redirect/pipe stdout. However, for a webservice,
/// the logs should be written to stdout for several reasons:
/// - stdout is bufferized, stderr is not
/// - some tools might parse the service logs and expect them to be on stdout
/// - we *expect* a webserver to output logging information, so since it's an expected
///   output (and not extra information), it should be on stdout
#[derive(Debug, PartialEq)]
enum EditoastMode {
    Webservice,
    Cli,
}

fn init_tracing(mode: EditoastMode, telemetry_config: &client::TelemetryConfig) {
    let env_filter_layer = tracing_subscriber::EnvFilter::builder()
        // Set the default log level to 'info'
        .with_default_directive(tracing_subscriber::filter::LevelFilter::INFO.into())
        .from_env_lossy();
    let fmt_layer = tracing_subscriber::fmt::layer()
        .pretty()
        .with_file(true)
        .with_line_number(false);
    let fmt_layer = if mode == EditoastMode::Cli {
        fmt_layer.with_writer(std::io::stderr).boxed()
    } else {
        fmt_layer.boxed()
    };
    // https://docs.rs/tracing-subscriber/latest/tracing_subscriber/layer/index.html#runtime-configuration-with-layers
    let telemetry_layer = match telemetry_config.telemetry_kind {
        client::TelemetryKind::None => None,
        client::TelemetryKind::Opentelemetry => {
            let exporter = opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(telemetry_config.telemetry_endpoint.as_str());
            let resource = Resource::new(vec![KeyValue::new(
                opentelemetry_semantic_conventions::resource::SERVICE_NAME,
                telemetry_config.service_name.clone(),
            )])
            .merge(&Resource::from_detectors(
                Duration::from_secs(10),
                vec![
                    Box::new(SdkProvidedResourceDetector),
                    Box::new(TelemetryResourceDetector),
                    Box::new(EnvResourceDetector::new()),
                ],
            ));
            let trace_config = opentelemetry_sdk::trace::Config::default().with_resource(resource);
            let otlp_tracer = opentelemetry_otlp::new_pipeline()
                .tracing()
                .with_exporter(exporter)
                .with_trace_config(trace_config)
                .install_batch(opentelemetry_sdk::runtime::Tokio)
                .expect("Failed to initialize Opentelemetry tracer")
                .tracer("osrd-editoast");
            let layer = tracing_opentelemetry::OpenTelemetryLayer::new(otlp_tracer);
            opentelemetry::global::set_text_map_propagator(TraceContextPropagator::new());
            Some(layer)
        }
    };
    tracing_subscriber::registry()
        .with(telemetry_layer)
        .with(env_filter_layer)
        .with(fmt_layer)
        .init();
}

impl EditoastMode {
    fn from_client(client: &Client) -> Self {
        if matches!(client.command, Commands::Runserver(_)) {
            EditoastMode::Webservice
        } else {
            EditoastMode::Cli
        }
    }
}

#[tokio::main]
async fn main() {
    match run().await {
        Ok(_) => (),
        Err(e) => {
            if let Some(e) = e.downcast_ref::<CliError>() {
                eprintln!("{e}");
                exit(e.exit_code);
            } else {
                error!("{e}");
                exit(2);
            }
        }
    }
}

async fn run() -> Result<(), Box<dyn Error + Send + Sync>> {
    let client = Client::parse();
    init_tracing(EditoastMode::from_client(&client), &client.telemetry_config);

    let pg_config = client.postgres_config;
    let db_pool =
        DbConnectionPoolV2::try_initialize(pg_config.database_url.clone(), pg_config.pool_size)
            .await?;

    let valkey_config = client.valkey_config;

    match client.color {
        Color::Never => colored::control::set_override(false),
        Color::Always => colored::control::set_override(true),
        Color::Auto => colored::control::set_override(std::io::stderr().is_terminal()),
    }

    match client.command {
        Commands::Runserver(args) => runserver(args, pg_config, valkey_config)
            .await
            .map_err(Into::into),
        Commands::ImportRollingStock(args) => import_rolling_stock(args, db_pool.into()).await,
        Commands::ImportTowedRollingStock(args) => {
            import_towed_rolling_stock(args, db_pool.into()).await
        }
        Commands::OsmToRailjson(args) => {
            osm_to_railjson::osm_to_railjson(args.osm_pbf_in, args.railjson_out)
        }
        Commands::Openapi => {
            print_openapi();
            Ok(())
        }
        Commands::ElectricalProfiles(subcommand) => match subcommand {
            ElectricalProfilesCommands::Import(args) => {
                electrical_profile_set_import(args, db_pool.into()).await
            }
            ElectricalProfilesCommands::List(args) => {
                electrical_profile_set_list(args, db_pool.into()).await
            }
            ElectricalProfilesCommands::Delete(args) => {
                electrical_profile_set_delete(args, db_pool.into()).await
            }
        },
        Commands::Search(subcommand) => match subcommand {
            SearchCommands::List => {
                list_search_objects();
                Ok(())
            }
            SearchCommands::MakeMigration(args) => make_search_migration(args),
            SearchCommands::Refresh(args) => refresh_search_tables(args, db_pool.into()).await,
        },
        Commands::Infra(subcommand) => match subcommand {
            InfraCommands::Clone(args) => clone_infra(args, db_pool.into()).await,
            InfraCommands::Clear(args) => clear_infra(args, db_pool.into(), valkey_config).await,
            InfraCommands::Generate(args) => {
                generate_infra(args, db_pool.into(), valkey_config).await
            }
            InfraCommands::ImportRailjson(args) => import_railjson(args, db_pool.into()).await,
        },
        Commands::Timetables(subcommand) => match subcommand {
            TimetablesCommands::Import(args) => trains_import(args, db_pool.into()).await,
            TimetablesCommands::Export(args) => trains_export(args, db_pool.into()).await,
        },
        Commands::STDCMSearchEnv(subcommand) => {
            handle_stdcm_search_env_command(subcommand, db_pool).await
        }
        Commands::Roles(roles_command) => match roles_command {
            RolesCommand::ListRoles => {
                roles::list_roles();
                Ok(())
            }
            RolesCommand::List(list_args) => {
                roles::list_subject_roles(list_args, Arc::new(db_pool))
                    .await
                    .map_err(Into::into)
            }
            RolesCommand::Add(add_args) => roles::add_roles(add_args, Arc::new(db_pool))
                .await
                .map_err(Into::into),
            RolesCommand::Remove(remove_args) => {
                roles::remove_roles(remove_args, Arc::new(db_pool))
                    .await
                    .map_err(Into::into)
            }
        },
        Commands::Healthcheck(core_config) => {
            healthcheck_cmd(db_pool.into(), valkey_config, core_config)
                .await
                .map_err(Into::into)
        }
    }
}

#[derive(Debug, Error, PartialEq)]
pub struct CliError {
    exit_code: i32,
    message: String,
}

impl std::fmt::Display for CliError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl CliError {
    pub fn new<T: AsRef<str>>(exit_code: i32, message: T) -> Self {
        CliError {
            exit_code,
            message: message.as_ref().to_string(),
        }
    }
}

impl From<anyhow::Error> for CliError {
    fn from(err: anyhow::Error) -> Self {
        CliError {
            exit_code: 1,
            message: format!("❌ {err}"),
        }
    }
}
