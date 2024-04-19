mod railjson;
pub mod track_section;

pub use railjson::RailJson;
pub use railjson::RAILJSON_VERSION;
pub use track_section::TrackSection;

cfg_if! {
    if #[cfg(test)] {
        pub use track_section::{Slope};
    }
}
