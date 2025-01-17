package fr.sncf.osrd.stdcm.graph

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.sim_infra.api.Block
import fr.sncf.osrd.stdcm.infra_exploration.InfraExplorerWithEnvelope
import fr.sncf.osrd.stdcm.preprocessing.interfaces.BlockAvailabilityInterface
import fr.sncf.osrd.stdcm.preprocessing.interfaces.BlockAvailabilityInterface.Availability
import fr.sncf.osrd.utils.units.Distance.Companion.fromMeters
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.meters
import java.util.*
import kotlin.math.max
import kotlin.math.min

/**
 * This class contains all the methods used to handle delays (how much we can add, how much we need
 * to add, and such)
 */
class DelayManager
internal constructor(
    private val minScheduleTimeStart: Double,
    private val maxRunTime: Double,
    private val blockAvailability: BlockAvailabilityInterface,
    private val graph: STDCMGraph,
    private val internalMargin:
        Double // Margin added to every occupancy, to account for binary search tolerance
) {
    /**
     * Returns one value per "opening" (interval between two unavailable times). Always returns the
     * shortest delay to add to enter this opening.
     */
    fun minimumDelaysPerOpening(
        infraExplorerWithNewEnvelope: InfraExplorerWithEnvelope,
        timeData: TimeData,
        envelope: Envelope,
        startOffset: Offset<Block>,
    ): NavigableSet<Double> {
        val startTime = timeData.earliestReachableTime
        val maximumDelay = computeMaximumDelay(timeData)
        val res = TreeSet<Double>()
        val endOffset = startOffset + fromMeters(envelope.endPos)
        var time = startTime
        while (java.lang.Double.isFinite(time)) {
            if (time - startTime > maximumDelay) break
            val availability =
                getLastBlockAvailability(
                    infraExplorerWithNewEnvelope,
                    startOffset,
                    endOffset,
                    time,
                )
            time +=
                when (availability) {
                    is BlockAvailabilityInterface.Available -> {
                        if (availability.maximumDelay >= internalMargin) res.add(time - startTime)
                        availability.maximumDelay + internalMargin
                    }
                    is BlockAvailabilityInterface.Unavailable -> {
                        availability.duration + internalMargin
                    }
                }
        }
        return res
    }

    /**
     * Compute how much delay we may add here. Prevents the generation of edges very far in the
     * future that would necessarily be discarded.
     */
    private fun computeMaximumDelay(data: TimeData): Double {
        val maxExtraRunTime = maxRunTime - data.totalRunningTime
        val maxDelayForMaxRunTime = data.maxDepartureDelayingWithoutConflict + maxExtraRunTime
        val maxDelayWithLocalConflict =
            data.timeOfNextConflictAtLocation - data.earliestReachableTime
        return max(0.0, min(maxDelayForMaxRunTime, maxDelayWithLocalConflict))
    }

    /** Returns the start time of the next occupancy for the block */
    fun findNextOccupancy(
        infraExplorer: InfraExplorerWithEnvelope,
        time: Double,
        startOffset: Offset<Block>,
        envelope: Envelope,
    ): Double {
        val endOffset = startOffset + fromMeters(envelope.endPos)
        val availability =
            getLastBlockAvailability(
                infraExplorer,
                startOffset,
                endOffset,
                time,
            )
        assert(availability.javaClass == BlockAvailabilityInterface.Available::class.java)
        return (availability as BlockAvailabilityInterface.Available).timeOfNextConflict
    }

    /**
     * Returns true if the total run time at the start of the edge is above the specified threshold
     */
    fun isRunTimeTooLong(edge: STDCMEdge): Boolean {
        val totalRunTime = edge.timeData.timeSinceDeparture

        // TODO: we should use the A* heuristic here, but that requires a small refactoring
        return totalRunTime > maxRunTime
    }

    /**
     * Returns by how much we can shift this envelope (in time) before causing a conflict.
     *
     * e.g. if the train takes 42s to go through the block, enters the block at t=10s, and we need
     * to leave the block at t=60s, this will return 8s.
     */
    fun findMaximumAddedDelay(
        infraExplorerWithNewEnvelope: InfraExplorerWithEnvelope,
        startTime: Double,
        startOffset: Offset<Block>,
        envelope: Envelope,
    ): Double {
        val endOffset = startOffset + fromMeters(envelope.endPos)
        val availability =
            getLastBlockAvailability(
                infraExplorerWithNewEnvelope,
                startOffset,
                endOffset,
                startTime,
            )
        assert(availability is BlockAvailabilityInterface.Available)
        return (availability as BlockAvailabilityInterface.Available).maximumDelay - internalMargin
    }

    /**
     * Calls `blockAvailability.getAvailability` on the last block. This accounts for the standard
     * allowance, as the envelopes in the infra explorer are scaled accordingly.
     */
    private fun getLastBlockAvailability(
        explorerWithNewEnvelope: InfraExplorerWithEnvelope,
        startOffset: Offset<Block>,
        endOffset: Offset<Block>,
        startTime: Double,
    ): Availability {
        val startOffsetOnPath =
            startOffset + explorerWithNewEnvelope.getPredecessorLength().distance
        val endOffsetOnPath = startOffsetOnPath + (endOffset - startOffset)
        return blockAvailability.getAvailability(
            explorerWithNewEnvelope,
            startOffsetOnPath.cast(),
            endOffsetOnPath.cast(),
            startTime
        )
    }

    /** Return how much time we can add to the stop at the end of the explorer */
    fun getMaxAdditionalStopDuration(
        explorerWithNewEnvelope: InfraExplorerWithEnvelope,
        endTime: Double,
    ): Double {
        val availability =
            blockAvailability.getAvailability(
                explorerWithNewEnvelope,
                explorerWithNewEnvelope.getSimulatedLength() - 10.meters,
                explorerWithNewEnvelope.getSimulatedLength(),
                endTime,
            )
        if (availability is BlockAvailabilityInterface.Available) return availability.maximumDelay
        return 0.0
    }
}
