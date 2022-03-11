mod generated_infra;
mod infra;
mod signal_layer;
mod speed_section_layer;
mod track_section_layer;

pub use generated_infra::GeneratedInfra;
pub use infra::{Infra, InfraError};
pub use signal_layer::SignalLayer;
pub use speed_section_layer::SpeedSectionLayer;
pub use track_section_layer::TrackSectionLayer;

use rocket_sync_db_pools::database;

#[database("postgres")]
pub struct DBConnection(pub diesel::PgConnection);
