package fr.sncf.osrd.standalone_sim

import fr.sncf.osrd.api.FullInfra
import fr.sncf.osrd.api.api_v2.standalone_sim.SimulationScheduleItem
import fr.sncf.osrd.railjson.schema.schedule.RJSTrainStop
import fr.sncf.osrd.sim_infra.api.*
import fr.sncf.osrd.sim_infra.impl.ChunkPath
import fr.sncf.osrd.utils.DistanceRangeMap
import fr.sncf.osrd.utils.distanceRangeMapOf
import fr.sncf.osrd.utils.indexing.StaticIdx
import fr.sncf.osrd.utils.indexing.StaticIdxList
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.Speed
import fr.sncf.osrd.utils.units.kilometersPerHour
import fr.sncf.osrd.utils.units.meters

/**
 * Simple internal class representing a stop with safety speed. Makes the function logic more
 * straightforward.
 */
private data class SafetySpeedStop(
    val offset: Offset<TravelledPath>,
    val isShortSlip: Boolean,
)

/**
 * Compute safety speed ranges, areas where the train has a lower speed limit because of a scheduled
 * stop. For details, see https://osrd.fr/en/docs/reference/design-docs/timetable/#modifiable-fields
 * (or google "VISA (VItesse Sécuritaire d'Approche)" for resources in French)
 */
fun makeSafetySpeedRanges(
    infra: FullInfra,
    chunkPath: ChunkPath,
    routes: StaticIdxList<Route>,
    schedule: List<SimulationScheduleItem>
): DistanceRangeMap<Speed> {
    val rawInfra = infra.rawInfra
    val zonePaths = routes.flatMap { rawInfra.getRoutePath(it) }
    val zonePathStartOffset = getRoutePathStartOffset(rawInfra, chunkPath, zonePaths)
    val signalOffsets = getSignalOffsets(infra, zonePaths, zonePathStartOffset)

    val stopsWithSafetySpeed =
        schedule
            .filter { it.receptionSignal.isStopOnClosedSignal }
            .map {
                SafetySpeedStop(
                    it.pathOffset,
                    it.receptionSignal == RJSTrainStop.RJSReceptionSignal.SHORT_SLIP_STOP
                )
            }
            .toMutableList()
    makeEndOfPathStop(rawInfra, routes, signalOffsets)?.let { stopsWithSafetySpeed.add(it) }

    val res = distanceRangeMapOf<Speed>()
    for (stop in stopsWithSafetySpeed) {
        // Currently, safety speed is applied to the next signal no matter the sight distance
        val nextSignalOffset = signalOffsets.first { it >= stop.offset }.distance
        res.put(
            lower = nextSignalOffset - 200.meters,
            upper = nextSignalOffset,
            value = 30.kilometersPerHour,
        )
        if (stop.isShortSlip) {
            res.put(
                lower = nextSignalOffset - 100.meters,
                upper = nextSignalOffset,
                value = 10.kilometersPerHour,
            )
        }
    }
    // Safety speed areas may extend outside the path
    return res.subMap(0.meters, chunkPath.length)
}

/**
 * Create a safety speed range at the end of the last route, either short slip or normal stop
 * depending on whether it ends at a buffer stop.
 */
private fun makeEndOfPathStop(
    infra: RawSignalingInfra,
    routes: StaticIdxList<Route>,
    signalOffsets: List<Offset<TravelledPath>>
): SafetySpeedStop? {
    val lastRouteExit = infra.getRouteExit(routes.last())
    val isBufferStop = infra.isBufferStop(lastRouteExit.value)
    if (isBufferStop) return SafetySpeedStop(signalOffsets.last(), true)
    return null
}

/** Return the offsets of block-delimiting signals on the path. */
fun getSignalOffsets(
    infra: FullInfra,
    zonePaths: List<StaticIdx<ZonePath>>,
    pathStartOffset: Offset<Path>,
): List<Offset<TravelledPath>> {
    val res = mutableListOf<Offset<TravelledPath>>()
    val rawInfra = infra.rawInfra
    val signalingInfra = infra.loadedSignalInfra
    var prevZonePathsLength = 0.meters
    for (zonePath in zonePaths) {
        val signalPositions = rawInfra.getSignalPositions(zonePath)
        val signals = rawInfra.getSignals(zonePath)
        for ((signal, signalPosition) in signals zip signalPositions) {
            val isDelimiter =
                signalingInfra.getLogicalSignals(signal).any { signalingInfra.isBlockDelimiter(it) }
            if (isDelimiter) {
                res.add(
                    Offset(prevZonePathsLength + signalPosition.distance - pathStartOffset.distance)
                )
            }
        }
        prevZonePathsLength += rawInfra.getZonePathLength(zonePath).distance
    }
    // Add one "signal" at the end of the last route no matter what.
    // There must be either a signal or a buffer stop, on which we may end safety speed ranges.
    res.add(Offset(prevZonePathsLength - pathStartOffset.distance))
    return res.filter { it.distance >= 0.meters }
}

/** Returns the offset where the train actually starts, compared to the start of the first route. */
fun getRoutePathStartOffset(
    infra: RawInfra,
    chunkPath: ChunkPath,
    zonePaths: List<ZonePathId>
): Offset<Path> {
    var prevChunksLength = Offset<Path>(0.meters)
    val routeChunks = zonePaths.flatMap { infra.getZonePathChunks(it) }

    var firstChunk = chunkPath.chunks[0]
    var firstChunkLength = infra.getTrackChunkLength(firstChunk.value)
    if (firstChunkLength == chunkPath.beginOffset && chunkPath.chunks.size > 1) {
        // If the path starts precisely at the end of the first chunk, it may not be present in the
        // route path. We can look for the next chunk instead.
        firstChunk = chunkPath.chunks[1]
        prevChunksLength += firstChunkLength.distance
    }

    for (chunk in routeChunks) {
        if (chunk == firstChunk) {
            return prevChunksLength + chunkPath.beginOffset.distance
        }
        prevChunksLength += infra.getTrackChunkLength(chunk.value).distance
    }
    throw RuntimeException("Unreachable (couldn't find first chunk in route list)")
}
