use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
#[command(about, long_about = "Extracts a railjson from OpenStreetMap data")]
pub struct OsmToRailjsonArgs {
    /// Input file in the OSM PBF format
    pub osm_pbf_in: PathBuf,
    /// Output file in Railjson format
    pub railjson_out: PathBuf,
}

fn main() {
    let args = OsmToRailjsonArgs::parse();
    osm_to_railjson::osm_to_railjson(args.osm_pbf_in, args.railjson_out)
        .expect("Could not convert osm to railjson");
}
