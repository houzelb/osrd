package fr.sncf.osrd.stdcm

import fr.sncf.osrd.graph.PathfindingEdgeLocationId
import fr.sncf.osrd.sim_infra.api.Block
import fr.sncf.osrd.utils.units.Duration
import fr.sncf.osrd.utils.units.TimeDelta

data class STDCMStep(
    val locations: Collection<PathfindingEdgeLocationId<Block>>,
    val duration: Double?,
    val stop: Boolean,
    val plannedTimingData: PlannedTimingData? = null,
)

data class PlannedTimingData(
    val arrivalTime: TimeDelta,
    val arrivalTimeToleranceBefore: Duration,
    val arrivalTimeToleranceAfter: Duration,
)
