package fr.sncf.osrd.conflicts

import fr.sncf.osrd.api.ConflictDetectionEndpoint.ConflictDetectionResult.Conflict
import fr.sncf.osrd.api.ConflictDetectionEndpoint.ConflictDetectionResult.Conflict.ConflictType
import fr.sncf.osrd.api.ConflictDetectionEndpoint.ConflictDetectionResult.ConflictRequirement
import fr.sncf.osrd.standalone_sim.result.ResultTrain.RoutingRequirement
import fr.sncf.osrd.standalone_sim.result.ResultTrain.SpacingRequirement
import kotlin.math.max
import kotlin.math.min

const val DEFAULT_WORK_SCHEDULE_ID: Long = -1

data class ConflictProperties(
    // If there are conflicts, minimum delay that should be added to the train so that there are no
    // conflicts anymore
    val minDelayWithoutConflicts: Double,
    // If there are no conflicts, maximum delay that can be added to the train without creating any
    // conflict
    val maxDelayWithoutConflicts: Double,
    // If there are no conflicts, minimum begin time of the next requirement that could conflict
    val timeOfNextConflict: Double,
)

fun incrementalConflictDetectorFromTrainReq(
    requirements: List<TrainRequirements>
): IncrementalConflictDetector {
    return IncrementalConflictDetectorImpl(convertTrainRequirements(requirements))
}

fun incrementalConflictDetectorFromReq(
    requirements: List<Requirements>
): IncrementalConflictDetector {
    return IncrementalConflictDetectorImpl(requirements)
}

interface IncrementalConflictDetector {
    fun checkConflicts(
        spacingRequirements: List<SpacingRequirement>,
        routingRequirements: List<RoutingRequirement>
    ): List<Conflict>

    fun analyseConflicts(
        spacingRequirements: List<SpacingRequirement>,
        routingRequirements: List<RoutingRequirement>
    ): ConflictProperties
}

class IncrementalConflictDetectorImpl(requirements: List<Requirements>) :
    IncrementalConflictDetector {
    private val spacingZoneRequirements =
        mutableMapOf<String, MutableList<SpacingZoneRequirement>>()
    private val routingZoneRequirements =
        mutableMapOf<String, MutableList<RoutingZoneRequirement>>()

    init {
        generateSpacingRequirements(requirements)
        generateRoutingRequirements(requirements)
    }

    data class SpacingZoneRequirement(
        val id: RequirementId,
        override val beginTime: Double,
        override val endTime: Double,
    ) : ResourceRequirement

    private fun generateSpacingRequirements(requirements: List<Requirements>) {
        // organize requirements by zone
        for (req in requirements) {
            for (spacingReq in req.spacingRequirements) {
                val zoneReq =
                    SpacingZoneRequirement(req.id, spacingReq.beginTime, spacingReq.endTime)
                spacingZoneRequirements.getOrPut(spacingReq.zone!!) { mutableListOf() }.add(zoneReq)
            }
        }
    }

    data class RoutingZoneConfig(
        val entryDet: String,
        val exitDet: String,
        val switches: Map<String, String>
    )

    data class RoutingZoneRequirement(
        val trainId: Long,
        val route: String,
        override val beginTime: Double,
        override val endTime: Double,
        val config: RoutingZoneConfig,
    ) : ResourceRequirement

    private fun generateRoutingRequirements(requirements: List<Requirements>) {
        // reorganize requirements by zone
        for (trainRequirements in requirements) {
            val trainId = trainRequirements.id.id
            for (routeRequirements in trainRequirements.routingRequirements) {
                val route = routeRequirements.route!!
                var beginTime = routeRequirements.beginTime
                // TODO: make it a parameter
                if (routeRequirements.zones.any { it.switches.isNotEmpty() }) beginTime -= 5.0
                for (zoneRequirement in routeRequirements.zones) {
                    val endTime = zoneRequirement.endTime
                    val config =
                        RoutingZoneConfig(
                            zoneRequirement.entryDetector,
                            zoneRequirement.exitDetector,
                            zoneRequirement.switches!!
                        )
                    val requirement =
                        RoutingZoneRequirement(trainId, route, beginTime, endTime, config)
                    routingZoneRequirements
                        .getOrPut(zoneRequirement.zone) { mutableListOf() }
                        .add(requirement)
                }
            }
        }
    }

    override fun checkConflicts(
        spacingRequirements: List<SpacingRequirement>,
        routingRequirements: List<RoutingRequirement>
    ): List<Conflict> {
        val res = mutableListOf<Conflict>()
        for (spacingRequirement in spacingRequirements) {
            res.addAll(checkSpacingRequirement(spacingRequirement))
        }
        for (routingRequirement in routingRequirements) {
            res.addAll(checkRoutingRequirement(routingRequirement))
        }
        return res
    }

    fun checkSpacingRequirement(req: SpacingRequirement): List<Conflict> {
        val requirements = spacingZoneRequirements[req.zone] ?: return listOf()

        val res = mutableListOf<Conflict>()
        for (otherReq in requirements) {
            val beginTime = max(req.beginTime, otherReq.beginTime)
            val endTime = min(req.endTime, otherReq.endTime)
            if (beginTime < endTime) {
                val trainIds = mutableListOf<Long>()
                val workScheduleIds = mutableListOf<Long>()
                if (otherReq.id.type == RequirementType.WORK_SCHEDULE)
                    workScheduleIds.add(otherReq.id.id)
                else trainIds.add(otherReq.id.id)
                val conflictReq = ConflictRequirement(req.zone, beginTime, endTime)
                res.add(
                    Conflict(
                        trainIds,
                        workScheduleIds,
                        beginTime,
                        endTime,
                        ConflictType.SPACING,
                        listOf(conflictReq)
                    )
                )
            }
        }

        return res
    }

    fun checkRoutingRequirement(req: RoutingRequirement): List<Conflict> {
        val res = mutableListOf<Conflict>()
        for (zoneReq in req.zones) {
            val zoneReqConfig =
                RoutingZoneConfig(zoneReq.entryDetector, zoneReq.exitDetector, zoneReq.switches!!)
            val requirements = routingZoneRequirements[zoneReq.zone!!] ?: continue

            for (otherReq in requirements) {
                if (otherReq.config == zoneReqConfig) continue
                val beginTime = max(req.beginTime, otherReq.beginTime)
                val endTime = min(zoneReq.endTime, otherReq.endTime)
                val conflictReq = ConflictRequirement(zoneReq.zone, beginTime, endTime)
                if (beginTime < endTime)
                    res.add(
                        Conflict(
                            listOf(otherReq.trainId),
                            beginTime,
                            endTime,
                            ConflictType.ROUTING,
                            listOf(conflictReq)
                        )
                    )
            }
        }
        return res
    }

    override fun analyseConflicts(
        spacingRequirements: List<SpacingRequirement>,
        routingRequirements: List<RoutingRequirement>
    ): ConflictProperties {
        val minDelayWithoutConflicts =
            minDelayWithoutConflicts(spacingRequirements, routingRequirements)
        if (minDelayWithoutConflicts != 0.0) { // There are initial conflicts
            return ConflictProperties(minDelayWithoutConflicts, 0.0, 0.0)
        } else { // There are no initial conflicts
            var maxDelay = Double.POSITIVE_INFINITY
            var timeOfNextConflict = Double.POSITIVE_INFINITY
            for (spacingRequirement in spacingRequirements) {
                if (spacingZoneRequirements[spacingRequirement.zone!!] != null) {
                    val endTime = spacingRequirement.endTime
                    for (requirement in spacingZoneRequirements[spacingRequirement.zone!!]!!) {
                        if (endTime <= requirement.beginTime) {
                            maxDelay = min(maxDelay, requirement.beginTime - endTime)
                            timeOfNextConflict = min(timeOfNextConflict, requirement.beginTime)
                        }
                    }
                }
            }
            for (routingRequirement in routingRequirements) {
                for (zoneReq in routingRequirement.zones) {
                    if (routingZoneRequirements[zoneReq.zone!!] != null) {
                        val endTime = zoneReq.endTime
                        val config =
                            RoutingZoneConfig(
                                zoneReq.entryDetector,
                                zoneReq.exitDetector,
                                zoneReq.switches!!
                            )
                        for (requirement in routingZoneRequirements[zoneReq.zone!!]!!) {
                            if (endTime <= requirement.beginTime && config != requirement.config) {
                                maxDelay = min(maxDelay, requirement.beginTime - endTime)
                                timeOfNextConflict = min(timeOfNextConflict, requirement.beginTime)
                            }
                        }
                    }
                }
            }
            return ConflictProperties(minDelayWithoutConflicts, maxDelay, timeOfNextConflict)
        }
    }

    fun minDelayWithoutConflicts(
        spacingRequirements: List<SpacingRequirement>,
        routingRequirements: List<RoutingRequirement>
    ): Double {
        var globalMinDelay = 0.0
        while (globalMinDelay.isFinite()) {
            var minDelay = 0.0
            for (spacingRequirement in spacingRequirements) {
                if (spacingZoneRequirements[spacingRequirement.zone!!] != null) {
                    val conflictingRequirements =
                        spacingZoneRequirements[spacingRequirement.zone!!]!!.filter {
                            !(spacingRequirement.beginTime >= it.endTime ||
                                spacingRequirement.endTime <= it.beginTime)
                        }
                    if (conflictingRequirements.isNotEmpty()) {
                        val latestEndTime = conflictingRequirements.maxOf { it.endTime }
                        minDelay = max(minDelay, latestEndTime - spacingRequirement.beginTime)
                    }
                }
            }
            for (routingRequirement in routingRequirements) {
                for (zoneReq in routingRequirement.zones) {
                    if (routingZoneRequirements[zoneReq.zone!!] != null) {
                        val config =
                            RoutingZoneConfig(
                                zoneReq.entryDetector,
                                zoneReq.exitDetector,
                                zoneReq.switches!!
                            )
                        val conflictingRequirements =
                            routingZoneRequirements[zoneReq.zone!!]!!.filter {
                                !(routingRequirement.beginTime >= it.endTime ||
                                    zoneReq.endTime <= it.beginTime) && config != it.config
                            }
                        if (conflictingRequirements.isNotEmpty()) {
                            val latestEndTime = conflictingRequirements.maxOf { it.endTime }
                            minDelay = max(minDelay, latestEndTime - routingRequirement.beginTime)
                        }
                    }
                }
            }
            // No new conflicts
            if (minDelay == 0.0) return globalMinDelay

            // Check for conflicts with newly added delay
            globalMinDelay += minDelay
            spacingRequirements.onEach {
                it.beginTime += minDelay
                it.endTime += minDelay
            }
            routingRequirements.onEach { routingRequirement ->
                routingRequirement.beginTime += minDelay
                routingRequirement.zones.onEach { it.endTime += minDelay }
            }
        }
        return Double.POSITIVE_INFINITY
    }
}
