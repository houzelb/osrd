package fr.sncf.osrd.utils.new_graph;

import com.google.common.graph.ImmutableNetwork;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import org.jetbrains.annotations.NotNull;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@SuppressFBWarnings(
        value = "FE_FLOATING_POINT_EQUALITY",
        justification = "No arithmetic is done on values where we test for equality, only copies"
)
public class Pathfinding<NodeT, EdgeT> {

    /** Pathfinding step */
    private record Step<EdgeT>(
            EdgeRange<EdgeT> range, // Next step
            Step<EdgeT> prev, // Previous step (to construct the result)
            double totalDistance, // Total distance from the start
            double weight, // Priority queue weight (could be different from totalDistance to allow for A*)
            int nReachedSteps // How many steps have been passed
    ) implements Comparable<Step<EdgeT>> {
        @Override
        public int compareTo(@NotNull Step<EdgeT> o) {
            if (weight != o.weight)
                return Double.compare(weight, o.weight);
            // If the weights are equal, we prioritize the highest number of reached steps
            return o.nReachedSteps - nReachedSteps;
        }
    }

    /** A location on a range, made of edge + offset. Used for the input of the pathfinding */
    public record EdgeLocation<EdgeT>(
            EdgeT edge,
            double offset
    ) {}

    /** A range, made of edge + start and end offsets on the edge. Used for the output of the pathfinding */
    public record EdgeRange<EdgeT>(
            EdgeT edge,
            double start,
            double end
    ) {}

    /** Step priority queue */
    private final PriorityQueue<Step<EdgeT>> queue;
    /** Function to call to get edge length */
    private final Function<EdgeT, Double> edgeToLength;
    /** Input graph */
    private final ImmutableNetwork<NodeT, EdgeT> graph;
    /** Keeps track of visited location. For each visited range, keeps the max number of passed steps at that point */
    private final HashMap<EdgeRange<EdgeT>, Integer> seen = new HashMap<>();
    // TODO: add a `private final Function<EdgeT, Boolean> isEdgeAllowed;` as optional parameter to filter some edges

    /** Returns the shortest path from any start edge to any end edge, as a list of edge (containing start and stop) */
    public static <NodeT, EdgeT> List<EdgeT> findEdgePath(
            ImmutableNetwork<NodeT, EdgeT> graph,
            List<Collection<EdgeLocation<EdgeT>>> locations,
            Function<EdgeT, Double> edgeToLength
    ) {
        return new Pathfinding<>(graph, edgeToLength).runPathfindingEdgesOnly(locations);
    }

    /** Returns the shortest path from any start edge to any end edge, as a list of (edge, start, end) */
    public static <NodeT, EdgeT> List<EdgeRange<EdgeT>> findPath(
            ImmutableNetwork<NodeT, EdgeT> graph,
            List<Collection<EdgeLocation<EdgeT>>> locations,
            Function<EdgeT, Double> edgeToLength
    ) {
        return new Pathfinding<>(graph, edgeToLength).runPathfinding(locations);
    }

    /** Constructor */
    private Pathfinding(
            ImmutableNetwork<NodeT, EdgeT> graph,
            Function<EdgeT, Double> edgeToLength
    ) {
        queue = new PriorityQueue<>();
        this.graph = graph;
        this.edgeToLength = edgeToLength;
    }

    /** Runs the pathfinding, returning a path as a list of (edge, start offset, end offset).
     * Each step is given as a collection of location.
     * It finds the shortest path from start to end, going through every intermediate step in order.
     * It uses Dijkstra algorithm internally, but can be changed to an A* with minor changes */
    private List<EdgeRange<EdgeT>> runPathfinding(
            List<Collection<EdgeLocation<EdgeT>>> locations
    ) {
        for (var location : locations.get(0)) {
            var startRange = new EdgeRange<>(location.edge, location.offset, edgeToLength.apply(location.edge));
            registerStep(startRange, null, 0, 0);
        }
        while (true) {
            var step = queue.poll();
            if (step == null)
                return null;
            if (hasReachedEnd(locations, step))
                return buildResult(step);
            for (var stopLocation : locations.get(step.nReachedSteps + 1))
                if (step.range.edge.equals(stopLocation.edge) && step.range.start <= stopLocation.offset) {
                    // Adds a new step precisely on the stop location. This ensures that we don't ignore the
                    // distance between the start of the edge and the stop location
                    var newRange = new EdgeRange<>(stopLocation.edge, step.range.start, stopLocation.offset);
                    registerStep(newRange, step.prev, step.totalDistance, step.nReachedSteps + 1);
                }
            var edgeLength = edgeToLength.apply(step.range.edge);
            if (step.range.end == edgeLength) {
                // We reach the end of the edge: we visit neighbors
                var lastNode = graph.incidentNodes(step.range.edge).nodeV();
                var neighbors = graph.outEdges(lastNode);
                for (var edge : neighbors) {
                    registerStep(
                            new EdgeRange<>(edge, 0, edgeToLength.apply(edge)),
                            step,
                            step.totalDistance,
                            step.nReachedSteps
                    );
                }
            } else {
                // We don't reach the end of the edge (intermediate step): we add a new step until the end
                var newRange = new EdgeRange<>(step.range.edge, step.range.end, edgeLength);
                registerStep(newRange, step, step.totalDistance, step.nReachedSteps);
            }
        }
    }

    /** Runs the pathfinding, returning a path as a list of edge. */
    private List<EdgeT> runPathfindingEdgesOnly(
            List<Collection<EdgeLocation<EdgeT>>> locations
    ) {
        var locatedSteps = runPathfinding(locations);
        if (locatedSteps == null)
            return null;
        return locatedSteps.stream()
                .map(step -> step.edge)
                .collect(Collectors.toList());
    }

    /** Returns true if the step has reached the end of the path */
    private boolean hasReachedEnd(
            List<Collection<EdgeLocation<EdgeT>>> locations,
            Step<EdgeT> step
    ) {
        return step.nReachedSteps >= locations.size() - 1;
    }

    /** Builds the result, iterating over the previous steps and merging ranges */
    private List<EdgeRange<EdgeT>> buildResult(Step<EdgeT> step) {
        var ranges = new ArrayDeque<EdgeRange<EdgeT>>();
        while (step != null) {
            ranges.addFirst(step.range);
            step = step.prev;
        }
        var res = new ArrayList<EdgeRange<EdgeT>>();
        for (var range : ranges) {
            var lastIndex = res.size() - 1;
            if (res.isEmpty() || res.get(lastIndex).edge != range.edge)
                res.add(range);
            else {
                var newRange = new EdgeRange<>(range.edge, res.get(lastIndex).start, range.end);
                res.set(lastIndex, newRange);
            }
        }
        return res;
    }

    /** Registers one step, adding the edge to the queue if not already seen */
    private void registerStep(EdgeRange<EdgeT> range, Step<EdgeT> prev, double prevDistance, int nPassedSteps) {
        if (!(seen.getOrDefault(range, -1) < nPassedSteps))
            return;
        double totalDistance = prevDistance + (range.end - range.start);
        var distanceLeftEstimation = 0; // Set this with geo coordinates if we want an A*
        queue.add(new Step<>(range, prev, totalDistance, totalDistance + distanceLeftEstimation, nPassedSteps));
        seen.put(range, nPassedSteps);
    }
}
