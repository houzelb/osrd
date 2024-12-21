use editoast_schemas::infra::Direction;
use editoast_schemas::infra::TrackOffset;
use editoast_schemas::primitives::Identifier;
use editoast_schemas::rolling_stock::LoadingGaugeType;
use editoast_schemas::train_schedule::PathItemLocation;
use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::core::{AsCoreRequest, Json};
use crate::error::InternalError;
use crate::views::path::projection::Intersection;

editoast_common::schemas! {
    IncompatibleConstraints,
    IncompatibleOffsetRangeWithValue,
    IncompatibleOffsetRange,
    PathfindingResultSuccess,
    OffsetRange,
    TrackRange,
    PathfindingInputError,
    PathfindingNotFound,
}

#[derive(Debug, Serialize)]
pub struct PathfindingRequest {
    /// Infrastructure id
    pub infra: i64,
    /// Infrastructure expected version
    pub expected_version: String,
    /// List of waypoints. Each waypoint is a list of track offset.
    pub path_items: Vec<Vec<TrackOffset>>,
    /// The loading gauge of the rolling stock
    pub rolling_stock_loading_gauge: LoadingGaugeType,
    /// Can the rolling stock run on non-electrified tracks
    pub rolling_stock_is_thermal: bool,
    /// List of supported electrification modes.
    /// Empty if does not support any electrification
    pub rolling_stock_supported_electrifications: Vec<String>,
    /// List of supported signaling systems
    pub rolling_stock_supported_signaling_systems: Vec<String>,
    /// Maximum speed of the rolling stock
    pub rolling_stock_maximum_speed: f64,
    /// Rolling stock length in meters:
    pub rolling_stock_length: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub struct OffsetRange {
    start: u64,
    end: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub struct IncompatibleOffsetRangeWithValue {
    range: OffsetRange,
    value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub struct IncompatibleOffsetRange {
    range: OffsetRange,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub struct IncompatibleConstraints {
    incompatible_electrification_ranges: Vec<IncompatibleOffsetRangeWithValue>,
    incompatible_gauge_ranges: Vec<IncompatibleOffsetRange>,
    incompatible_signaling_system_ranges: Vec<IncompatibleOffsetRangeWithValue>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, ToSchema)]
pub struct InvalidPathItem {
    pub index: usize,
    pub path_item: PathItemLocation,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum PathfindingCoreResult {
    Success(PathfindingResultSuccess),
    NotFoundInBlocks {
        track_section_ranges: Vec<TrackRange>,
        length: u64,
    },
    NotFoundInRoutes {
        track_section_ranges: Vec<TrackRange>,
        length: u64,
    },
    NotFoundInTracks,
    IncompatibleConstraints {
        relaxed_constraints_path: Box<PathfindingResultSuccess>,
        incompatible_constraints: Box<IncompatibleConstraints>,
    },
    InvalidPathItems {
        items: Vec<InvalidPathItem>,
    },
    NotEnoughPathItems,
    RollingStockNotFound {
        rolling_stock_name: String,
    },
    InternalError {
        core_error: InternalError,
    },
}

/// A successful pathfinding result. This is also used for STDCM response.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, ToSchema)]
pub struct PathfindingResultSuccess {
    #[schema(inline)]
    /// Path description as block ids
    pub blocks: Vec<Identifier>,
    #[schema(inline)]
    /// Path description as route ids
    pub routes: Vec<Identifier>,
    /// Path description as track ranges
    pub track_section_ranges: Vec<TrackRange>,
    /// Length of the path in mm
    pub length: u64,
    /// The path offset in mm of each path item given as input of the pathfinding
    /// The first value is always `0` (beginning of the path) and the last one is always equal to the `length` of the path in mm
    pub path_item_positions: Vec<u64>,
}

// Enum for input-related errors
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, ToSchema)]
#[serde(tag = "error_type", rename_all = "snake_case")]
pub enum PathfindingInputError {
    InvalidPathItems {
        #[schema(inline)]
        items: Vec<InvalidPathItem>,
    },
    NotEnoughPathItems,
    RollingStockNotFound {
        rolling_stock_name: String,
    },
}

// Enum for not-found results and incompatible constraints
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, ToSchema)]
#[serde(tag = "error_type", rename_all = "snake_case")]
pub enum PathfindingNotFound {
    NotFoundInBlocks {
        track_section_ranges: Vec<TrackRange>,
        length: u64,
    },
    NotFoundInRoutes {
        track_section_ranges: Vec<TrackRange>,
        length: u64,
    },
    NotFoundInTracks,
    IncompatibleConstraints {
        relaxed_constraints_path: Box<PathfindingResultSuccess>,
        incompatible_constraints: Box<IncompatibleConstraints>,
    },
}

/// An oriented range on a track section.
/// `begin` is always less than `end`.
#[derive(Serialize, Deserialize, Clone, ToSchema, Hash, PartialEq, Eq)]
pub struct TrackRange {
    /// The track section identifier.
    #[schema(inline)]
    pub track_section: Identifier,
    /// The beginning of the range in mm.
    pub begin: u64,
    /// The end of the range in mm.
    pub end: u64,
    /// The direction of the range.
    pub direction: Direction,
}

impl From<editoast_schemas::infra::DirectionalTrackRange> for TrackRange {
    fn from(value: editoast_schemas::infra::DirectionalTrackRange) -> Self {
        assert!(value.begin <= value.end);
        TrackRange {
            track_section: value.track,
            begin: (value.begin * 1000.).round() as u64,
            end: (value.end * 1000.).round() as u64,
            direction: value.direction,
        }
    }
}

impl std::fmt::Debug for TrackRange {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(f, "'{}+", self.track_section)?;
        if matches!(self.direction, Direction::StartToStop) {
            write!(f, "{}-{}'", self.begin, self.end)
        } else {
            write!(f, "{}-{}'", self.end, self.begin)
        }
    }
}

#[cfg(test)]
impl std::str::FromStr for TrackRange {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let Some((name, offsets)) = s.split_once('+') else {
            return Err(String::from(
                "track range must contain at least a '+' and be of the form \"A+12-25\"",
            ));
        };
        let track_section = Identifier::from(name);
        let Some((begin, end)) = offsets.split_once('-') else {
            return Err(String::from("track range must contain '-' to separate the offsets and be of the form \"A+12-25\""));
        };
        let Ok(begin) = begin.parse() else {
            return Err(format!("{begin} in track range should be an integer"));
        };
        let Ok(end) = end.parse() else {
            return Err(format!("{end} in track range should be an integer"));
        };
        assert!(begin != end); // Impossible to determine direction in this case
        let (begin, end, direction) = if begin < end {
            (begin, end, Direction::StartToStop)
        } else {
            (end, begin, Direction::StopToStart)
        };
        Ok(TrackRange {
            track_section,
            begin,
            end,
            direction,
        })
    }
}

impl TrackRange {
    #[cfg(test)]
    /// Creates a new `TrackRange`.
    pub fn new<T: AsRef<str>>(
        track_section: T,
        begin: u64,
        end: u64,
        direction: Direction,
    ) -> Self {
        assert!(begin <= end);
        Self {
            track_section: track_section.as_ref().into(),
            begin,
            end,
            direction,
        }
    }

    /// Returns the starting offset of the range (depending on the direction).
    pub fn start(&self) -> u64 {
        if self.direction == Direction::StartToStop {
            self.begin
        } else {
            self.end
        }
    }

    /// Returns the ending offset of the range (depending on the direction).
    pub fn stop(&self) -> u64 {
        if self.direction == Direction::StartToStop {
            self.end
        } else {
            self.begin
        }
    }

    /// Computes a TrackRangeOffset location on this track range following its direction
    pub fn offset(&self, offset: u64) -> TrackRangeOffset<'_> {
        assert!(offset <= self.length(), "offset out of track range bounds");
        TrackRangeOffset {
            track_range: self,
            offset,
        }
    }

    pub fn length(&self) -> u64 {
        self.end - self.begin
    }

    // Check if the 2 track ranges overlap.
    // Intersection have non-null length and are offsets from the beginning
    // of the `self` track range.
    pub fn overlap(&self, track_range: &TrackRange) -> Option<Intersection> {
        if self.track_section != track_range.track_section {
            return None;
        }
        let begin = std::cmp::max(self.begin, track_range.begin);
        let end = std::cmp::min(self.end, track_range.end);
        // In case of equality, we don't consider it an overlap
        if begin < self.end && end > self.begin {
            Some(Intersection::from((begin, end)))
        } else {
            None
        }
    }
}

pub struct TrackRangeOffset<'a> {
    track_range: &'a TrackRange,
    pub offset: u64,
}

impl TrackRangeOffset<'_> {
    pub fn as_track_offset(&self) -> TrackOffset {
        if self.track_range.direction == Direction::StartToStop {
            return TrackOffset::new(
                &self.track_range.track_section,
                self.offset + self.track_range.begin,
            );
        }
        TrackOffset::new(
            &self.track_range.track_section,
            self.track_range.end - self.offset,
        )
    }
}

impl AsCoreRequest<Json<PathfindingCoreResult>> for PathfindingRequest {
    const METHOD: reqwest::Method = reqwest::Method::POST;
    const URL_PATH: &'static str = "/v2/pathfinding/blocks";

    fn infra_id(&self) -> Option<i64> {
        Some(self.infra)
    }
}
