package fr.sncf.osrd.railjson.schema.common

import com.squareup.moshi.Json
import fr.sncf.osrd.railjson.schema.infra.trackranges.RJSDirectionalTrackRange

data class RJSTemporarySpeedLimit(
    @Json(name = "speed_limit") val speedLimit: Double,
    @Json(name = "track_ranges") val trackRanges: List<RJSDirectionalTrackRange>,
)
// TODO delete me
