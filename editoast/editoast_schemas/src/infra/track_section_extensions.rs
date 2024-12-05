use serde::Deserialize;
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::TrackSectionSncfExtension;
use crate::infra::TrackSectionSourceExtension;

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct TrackSectionExtensions {
    #[schema(inline)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sncf: Option<TrackSectionSncfExtension>,
    #[schema(inline)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<TrackSectionSourceExtension>,
}
