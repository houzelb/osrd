package fr.sncf.osrd.stdcm.graph

import fr.sncf.osrd.api.FullInfra
import fr.sncf.osrd.api.pathfinding.constraints.ElectrificationConstraints
import fr.sncf.osrd.api.pathfinding.constraints.LoadingGaugeConstraints
import fr.sncf.osrd.api.pathfinding.makeHeuristics
import fr.sncf.osrd.envelope_sim.allowances.utils.AllowanceValue
import fr.sncf.osrd.graph.*
import fr.sncf.osrd.graph.Pathfinding.EdgeLocation
import fr.sncf.osrd.sim_infra.api.Block
import fr.sncf.osrd.stdcm.STDCMResult
import fr.sncf.osrd.stdcm.STDCMStep
import fr.sncf.osrd.stdcm.infra_exploration.initInfraExplorer
import fr.sncf.osrd.stdcm.infra_exploration.initInfraExplorerWithEnvelope
import fr.sncf.osrd.stdcm.preprocessing.interfaces.BlockAvailabilityInterface
import fr.sncf.osrd.train.RollingStock
import fr.sncf.osrd.train.RollingStock.Comfort
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.meters

/** Given an infra, a rolling stock and a collection of unavailable time for each block,
 * find a path made of a sequence of block ranges with a matching envelope.
 * Returns null if no path is found.
 */
fun findPath(
    fullInfra: FullInfra,
    rollingStock: RollingStock,
    comfort: Comfort?,
    startTime: Double,
    steps: List<STDCMStep>,
    blockAvailability: BlockAvailabilityInterface,
    timeStep: Double,
    maxDepartureDelay: Double,
    maxRunTime: Double,
    tag: String?,
    standardAllowance: AllowanceValue?,
    pathfindingTimeout: Double
): STDCMResult? {
    assert(steps.size >= 2) { "Not enough steps have been set to find a path" }
    val graph = STDCMGraph(
        fullInfra.rawInfra,
        fullInfra.blockInfra,
        rollingStock,
        comfort,
        timeStep,
        blockAvailability,
        maxRunTime,
        startTime,
        steps,
        tag,
        standardAllowance
    )

    // Initializes the constraints
    val loadingGaugeConstraints = LoadingGaugeConstraints(
        fullInfra.blockInfra, fullInfra.rawInfra,
        listOf(rollingStock)
    )
    val electrificationConstraints = ElectrificationConstraints(
        fullInfra.blockInfra, fullInfra.rawInfra,
        listOf(rollingStock)
    )

    // Initialize the A* heuristic
    val locations = steps.stream()
        .map(STDCMStep::locations)
        .toList()
    val remainingDistanceEstimators = makeHeuristics(fullInfra, locations)
    val path = Pathfinding(graph)
        .setEdgeToLength { edge -> edge.infraExplorer.getCurrentBlockLength().cast() }
        .setRemainingDistanceEstimator(makeAStarHeuristic(remainingDistanceEstimators, rollingStock))
        .setEdgeToLength { edge -> edge.length.cast() }
        .addBlockedRangeOnEdges { edge -> convertRanges(loadingGaugeConstraints.apply(edge.block)) }
        .addBlockedRangeOnEdges { edge -> convertRanges(electrificationConstraints.apply(edge.block)) }
        .setTotalCostUntilEdgeLocation { range ->
            totalCostUntilEdgeLocation(
                range,
                maxDepartureDelay
            )
        }
        .setTimeout(pathfindingTimeout)
        .runPathfinding(
            convertLocations(graph, steps[0].locations, startTime, maxDepartureDelay),
            makeObjectiveFunction(steps)
        ) ?: return null
    return STDCMPostProcessing(graph).makeResult(
        fullInfra.rawInfra,
        path,
        startTime,
        graph.standardAllowance,
        rollingStock,
        timeStep,
        comfort,
        maxRunTime,
        blockAvailability
    )
}

/** Converts ranges with block offsets to ranges with STDCMEdge offset */
fun convertRanges(ranges: Collection<Pathfinding.Range<Block>>): Collection<Pathfinding.Range<STDCMEdge>> {
    return ranges
        .map { range -> Pathfinding.Range(range.start.cast(), range.end.cast()) }
}

/** Make the objective function from the edge locations  */
private fun makeObjectiveFunction(
    steps: List<STDCMStep>
): List<TargetsOnEdge<STDCMEdge, STDCMEdge>> {
    val globalResult = ArrayList<TargetsOnEdge<STDCMEdge, STDCMEdge>>()
    for (i in 1 until steps.size) {
        val step = steps[i]
        globalResult.add { edge ->
            val res = HashSet<EdgeLocation<STDCMEdge, STDCMEdge>>()
            for (loc in step.locations)
                if (loc.edge == edge.block) {
                    val offsetOnEdge: Offset<STDCMEdge> =
                        loc.offset.cast<STDCMEdge>() - edge.envelopeStartOffset.distance
                    if (offsetOnEdge >= Offset(0.meters) && offsetOnEdge <= edge.length)
                        res.add(EdgeLocation(edge, offsetOnEdge))
                }
            res
        }
    }
    return globalResult
}

/** Compute the total cost of a path (in s) to an edge location
 * This estimation of the total cost is used to compare paths in the pathfinding algorithm.
 * We select the shortest path (in duration), and for 2 paths with the same duration, we select the earliest one.
 * The path weight which takes into account the total duration of the path and the time shift at the departure
 * (with different weights): path_duration * searchTimeRange + departure_time_shift.
 *
 * <br></br>
 * EXAMPLE
 * Let's assume we are trying to find a train between 9am and 10am. The searchTimeRange is 1 hour (3600s).
 * Let's assume we have found two possible trains:
 * - the first one leaves at 9:59 and lasts for 20:00 min.
 * - the second one leaves at 9:00 and lasts for 20:01 min.
 * As we are looking for the fastest train, the first train should have the lightest weight, which is the case with
 * the formula above. */
private fun totalCostUntilEdgeLocation(
    range: EdgeLocation<STDCMEdge, STDCMEdge>,
    searchTimeRange: Double
): Double {
    val envelope = range.edge.envelope
    val timeEnd = interpolateTime(
        envelope,
        range.offset,
        range.edge.timeStart,
        range.edge.standardAllowanceSpeedFactor
    )
    val pathDuration = timeEnd - range.edge.totalDepartureTimeShift
    return pathDuration * searchTimeRange + range.edge.totalDepartureTimeShift
}

/** Converts the "raw" heuristics based on physical blocks, returning the most optimistic distance,
 * into heuristics based on stdcm edges, returning the most optimistic time  */
private fun makeAStarHeuristic(
    baseBlockHeuristics: ArrayList<AStarHeuristicId<Block>>,
    rollingStock: RollingStock
): List<AStarHeuristic<STDCMEdge, STDCMEdge>> {
    val res = ArrayList<AStarHeuristic<STDCMEdge, STDCMEdge>>()
    for (baseBlockHeuristic in baseBlockHeuristics) {
        res.add(AStarHeuristic { edge, offset ->
            val distance = baseBlockHeuristic.apply(edge.block,
                convertOffsetToBlock(offset, edge.envelopeStartOffset))
            distance / rollingStock.maxSpeed
        })
    }
    return res
}

/** Converts locations on a block id into a location on a STDCMGraph.Edge.  */
private fun convertLocations(
    graph: STDCMGraph,
    locations: Collection<PathfindingEdgeLocationId<Block>>,
    startTime: Double,
    maxDepartureDelay: Double
): Set<EdgeLocation<STDCMEdge, STDCMEdge>> {
    val res = HashSet<EdgeLocation<STDCMEdge, STDCMEdge>>()
    for (location in locations) {
        val infraExplorers = initInfraExplorerWithEnvelope(graph.rawInfra, graph.blockInfra, location)
        for (explorer in infraExplorers) {
            val edges = STDCMEdgeBuilder(explorer, graph)
                .setStartTime(startTime)
                .setStartOffset(location.offset)
                .setPrevMaximumAddedDelay(maxDepartureDelay)
                .makeAllEdges()
            for (edge in edges)
                res.add(EdgeLocation(edge, Offset(0.meters)))
        }
    }
    return res
}
