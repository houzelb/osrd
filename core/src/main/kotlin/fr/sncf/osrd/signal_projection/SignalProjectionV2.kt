package fr.sncf.osrd.signal_projection

import fr.sncf.osrd.api.FullInfra
import fr.sncf.osrd.api.api_v2.SpacingRequirement
import fr.sncf.osrd.api.api_v2.ZoneUpdate
import fr.sncf.osrd.api.api_v2.project_signals.SignalUpdate
import fr.sncf.osrd.conflicts.TravelledPath
import fr.sncf.osrd.reporting.exceptions.OSRDError
import fr.sncf.osrd.signaling.SigSystemManager
import fr.sncf.osrd.signaling.SignalingSimulator
import fr.sncf.osrd.signaling.ZoneStatus
import fr.sncf.osrd.sim_infra.api.*
import fr.sncf.osrd.sim_infra.impl.ChunkPath
import fr.sncf.osrd.standalone_sim.PathOffsetBuilder
import fr.sncf.osrd.standalone_sim.PathSignal
import fr.sncf.osrd.standalone_sim.pathSignalsInRange
import fr.sncf.osrd.standalone_sim.trainPathBlockOffset
import fr.sncf.osrd.utils.indexing.StaticIdxList
import fr.sncf.osrd.utils.units.Duration
import fr.sncf.osrd.utils.units.Length
import fr.sncf.osrd.utils.units.TimeDelta
import fr.sncf.osrd.utils.units.meters
import java.awt.Color

data class SignalAspectChangeEventV2(val newAspect: String, val time: TimeDelta)

fun projectSignals(
    fullInfra: FullInfra,
    chunkPath: ChunkPath,
    blockPath: StaticIdxList<Block>,
    routePath: StaticIdxList<Route>,
    spacingRequirements: Collection<SpacingRequirement>,
    zoneUpdates: Collection<ZoneUpdate>,
    simulationEndTime: TimeDelta
): List<SignalUpdate> {
    val rawInfra = fullInfra.rawInfra
    val loadedSignalInfra = fullInfra.loadedSignalInfra
    val blockInfra = fullInfra.blockInfra
    val simulator = fullInfra.signalingSimulator
    val sigModuleManager = simulator.sigModuleManager

    // TODO: allowed signaling systems should depend on the type of train
    val sigSystemManager = simulator.sigModuleManager
    val bal = sigSystemManager.findSignalingSystemOrThrow("BAL")
    val bapr = sigSystemManager.findSignalingSystemOrThrow("BAPR")
    val tvm300 = sigSystemManager.findSignalingSystemOrThrow("TVM300")
    val tvm430 = sigSystemManager.findSignalingSystemOrThrow("TVM430")

    val leastConstrainingStates = mutableMapOf<SignalingSystemId, SigState>()
    leastConstrainingStates[bal] = (sigModuleManager.getStateSchema(bal)) { value("aspect", "VL") }
    leastConstrainingStates[bapr] = (sigModuleManager.getStateSchema(bapr)) {
        value("aspect", "VL")
    }
    leastConstrainingStates[tvm300] = (sigModuleManager.getStateSchema(tvm300)) {
        value("aspect", "300VL")
    }
    leastConstrainingStates[tvm430] = (sigModuleManager.getStateSchema(tvm430)) {
        value("aspect", "300VL")
    }

    val zoneMap = mutableMapOf<String, Int>()
    var zoneCount = 0
    for (block in blockPath) {
        for (zonePath in blockInfra.getBlockPath(block)) {
            val zone = rawInfra.getZonePathZone(zonePath)
            val zoneName = rawInfra.getZoneName(zone)
            zoneMap[zoneName] = zoneCount
            zoneCount++
        }
    }

    // Compute signal updates
    val startOffset =
        trainPathBlockOffset(fullInfra.rawInfra, fullInfra.blockInfra, blockPath, chunkPath)
    // Compute path signals on path
    val pathOffsetBuilder = PathOffsetBuilder(startOffset)
    val pathSignals =
        pathSignalsInRange(
            pathOffsetBuilder,
            blockPath,
            blockInfra,
            0.meters,
            chunkPath.endOffset - chunkPath.beginOffset
        )
    if (pathSignals.isEmpty()) return emptyList()

    val signalAspectChangeInfos =
        computeSignalAspectChangeInfos(
            blockPath,
            routePath,
            zoneMap,
            blockInfra,
            pathSignals,
            zoneUpdates,
            simulator,
            rawInfra,
            loadedSignalInfra,
            leastConstrainingStates,
        )
    val zoneSpacingRequirementStarts =
        spacingRequirements.associateBy({ it.zone }, { it.beginTime })
    val signalUpdates =
        signalUpdates(
            pathSignals,
            signalAspectChangeInfos,
            loadedSignalInfra,
            sigSystemManager,
            rawInfra,
            zoneSpacingRequirementStarts,
            Length(chunkPath.endOffset - chunkPath.beginOffset),
            simulationEndTime
        )
    return signalUpdates
}

data class SignalAspectChangeInfo(
    val farthestProtectedZoneName: String?,
    val events: List<SignalAspectChangeEventV2>,
)

private fun computeSignalAspectChangeInfos(
    blockPath: StaticIdxList<Block>,
    routePath: StaticIdxList<Route>,
    zoneToPathIndexMap: Map<String, Int>,
    blockInfra: BlockInfra,
    pathSignals: List<PathSignal>,
    zoneUpdates: Collection<ZoneUpdate>,
    simulator: SignalingSimulator,
    rawInfra: RawInfra,
    loadedSignalInfra: LoadedSignalInfra,
    leastConstrainingStates: Map<SignalingSystemId, SigState>,
): Map<PathSignal, SignalAspectChangeInfo> {
    val routes = routePath.toList()
    val zoneCount = blockPath.sumOf { blockInfra.getBlockPath(it).size }
    val zoneStates = ArrayList<ZoneStatus>(zoneCount)
    for (i in 0 until zoneCount) zoneStates.add(ZoneStatus.CLEAR)

    val signalAspects =
        pathSignals
            .associateBy(
                { it.signal },
                {
                    leastConstrainingStates[loadedSignalInfra.getSignalingSystem(it.signal)]!!
                        .getEnum("aspect")
                }
            )
            .toMutableMap()

    val blockSignals = blockInfra.getBlockSignals(blockPath.last())
    // We can't just `pathSignals.last().signal` as the simulation includes the whole block
    val lastSignal = blockSignals[blockSignals.size - 1]
    val lastSignalDriver = loadedSignalInfra.getDrivers(lastSignal).lastOrNull()
    val lastSignalInputSystem =
        if (lastSignalDriver != null) {
            simulator.sigModuleManager.getInputSignalingSystem(lastSignalDriver)
        } else {
            loadedSignalInfra.getSignalingSystem(
                lastSignal
            ) // If it could not connect to anything, lets pretend it does to itself
        }
    val nextSignalState = leastConstrainingStates[lastSignalInputSystem]!!

    val signalAspectChangeEvents =
        pathSignals.associateBy({ it }, { mutableListOf<SignalAspectChangeEventV2>() })
    val signalFarthestProtectedZoneName = mutableMapOf<PathSignal, String>()
    for (event in zoneUpdates) {
        if (!zoneToPathIndexMap.containsKey(event.zone)) continue
        zoneStates[zoneToPathIndexMap[event.zone]!!] =
            if (event.isEntry) ZoneStatus.OCCUPIED else ZoneStatus.CLEAR

        val simulatedSignalStates =
            simulator.evaluate(
                rawInfra,
                loadedSignalInfra,
                blockInfra,
                blockPath,
                routes,
                blockPath.size,
                zoneStates,
                ZoneStatus.CLEAR,
                nextSignalState
            )
        val simulatedAspects = simulatedSignalStates.mapValues { it.value.getEnum("aspect") }
        for (pathSignal in pathSignals) {
            val signal = pathSignal.signal
            val aspect = simulatedAspects[signal] ?: continue
            if (signalAspects[signal]!! == aspect) continue
            // Remember the zone that triggers the first signal change
            if (signalAspectChangeEvents[pathSignal]!!.isEmpty()) {
                signalFarthestProtectedZoneName[pathSignal] = event.zone
            }
            signalAspectChangeEvents[pathSignal]!!.add(
                SignalAspectChangeEventV2(aspect, event.time)
            )
            signalAspects[signal] = aspect
        }
    }
    return signalAspectChangeEvents
        .map { it.key to SignalAspectChangeInfo(signalFarthestProtectedZoneName[it.key], it.value) }
        .toMap()
}

private fun signalUpdates(
    signalsOnPath: List<PathSignal>,
    signalAspectChangeInfos: Map<PathSignal, SignalAspectChangeInfo>,
    loadedSignalInfra: LoadedSignalInfra,
    sigSystemManager: SigSystemManager,
    rawInfra: RawInfra,
    zoneSpacingRequirementStarts: Map<String, TimeDelta>,
    travelledPathLength: Length<TravelledPath>,
    simulationEndTime: TimeDelta,
): MutableList<SignalUpdate> {

    val signalUpdates = mutableListOf<SignalUpdate>()

    // Let's generate signal updates for the SNCF GET
    // The logic here is specific to that, signalUpdates shouldn't be used for anything else
    // TODO: maybe have those be specific to the signaling system
    // FIXME: this doesn't work if the train goes through the same signal twice
    // This is probably a weird edge case anyway
    fun blinking(aspect: String): Boolean {
        return aspect == "(A)"
    }

    fun color(aspect: String): Int {
        return when (aspect) {
            "VL" -> Color.GREEN.rgb
            "A" -> Color.YELLOW.rgb
            "(A)" -> Color.YELLOW.rgb
            "S" -> Color.RED.rgb
            "C" -> Color.RED.rgb
            "300VL" -> Color.GREEN.rgb
            "300(VL)" -> Color.GRAY.rgb
            "270A" -> Color.GRAY.rgb
            "220A" -> Color.GRAY.rgb
            "160A" -> Color.GRAY.rgb
            "080A" -> Color.GRAY.rgb
            "000" -> Color.GRAY.rgb
            "RRR" -> Color.RED.rgb
            "OCCUPIED" -> Color.RED.rgb
            else -> throw OSRDError.newAspectError(aspect)
        }
    }

    val nextSignal = mutableMapOf<LogicalSignalId, PathSignal>()
    for (i in 0 until signalsOnPath.size - 1) {
        nextSignal[signalsOnPath[i].signal] = signalsOnPath[i + 1]
    }

    for ((pathSignal, info) in signalAspectChangeInfos) {
        val signal = pathSignal.signal
        val signalingSystem = loadedSignalInfra.getSignalingSystem(signal)
        val signalingSystemName = sigSystemManager.getName(signalingSystem)
        val physicalSignalId = loadedSignalInfra.getPhysicalSignal(signal)
        val physicalSignalName = rawInfra.getPhysicalSignalName(physicalSignalId)
        val positionStart = pathSignal.pathOffset
        val positionEnd =
            if (nextSignal.contains(signal)) nextSignal[signal]!!.pathOffset
            else travelledPathLength

        if (info.events.isEmpty()) continue

        // Compute the "green" section
        // It happens before the first event
        if (
            info.events.first().time != Duration.ZERO &&
                zoneSpacingRequirementStarts.contains(info.farthestProtectedZoneName)
        ) {
            val event = info.events.first()
            val timeEnd = event.time
            val timeStart = zoneSpacingRequirementStarts[info.farthestProtectedZoneName]!!
            if (timeEnd > timeStart) {
                signalUpdates.add(
                    SignalUpdate(
                        physicalSignalName!!,
                        signalingSystemName,
                        timeStart,
                        timeEnd,
                        positionStart,
                        positionEnd,
                        color("VL"),
                        blinking("VL"),
                        "VL"
                    )
                )
            }
        }

        for (i in 0 until info.events.size - 1) {
            val event = info.events[i]
            val nextEvent = info.events[i + 1]
            signalUpdates.add(
                SignalUpdate(
                    physicalSignalName!!,
                    signalingSystemName,
                    event.time,
                    nextEvent.time,
                    positionStart,
                    positionEnd,
                    color(event.newAspect),
                    blinking(event.newAspect),
                    event.newAspect
                )
            )
        }

        // The last event only generates an update if the signal doesn't return to VL
        if (info.events.last().newAspect != "VL" && info.events.last().newAspect != "300VL") {
            val event = info.events.last()
            val timeStart = event.time
            signalUpdates.add(
                SignalUpdate(
                    physicalSignalName!!,
                    signalingSystemName,
                    timeStart,
                    simulationEndTime,
                    positionStart,
                    positionEnd,
                    color(event.newAspect),
                    blinking(event.newAspect),
                    event.newAspect
                )
            )
        }
    }
    return signalUpdates
}
