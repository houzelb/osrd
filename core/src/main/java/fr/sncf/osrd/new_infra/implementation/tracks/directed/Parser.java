package fr.sncf.osrd.new_infra.implementation.tracks.directed;

import static fr.sncf.osrd.new_infra.api.tracks.directed.DiTrackEdge.ORIENTED_TRACK_OBJECTS;
import static fr.sncf.osrd.new_infra.api.tracks.undirected.TrackEdge.INDEX;
import static fr.sncf.osrd.new_infra.api.tracks.undirected.TrackEdge.TRACK_OBJECTS;
import static fr.sncf.osrd.new_infra.implementation.GraphHelpers.*;
import static fr.sncf.osrd.utils.graph.EdgeEndpoint.endEndpoint;

import com.google.common.collect.HashBiMap;
import com.google.common.graph.ImmutableNetwork;
import com.google.common.graph.NetworkBuilder;
import fr.sncf.osrd.new_infra.api.Direction;
import fr.sncf.osrd.new_infra.api.tracks.directed.DiTrackEdge;
import fr.sncf.osrd.new_infra.api.tracks.directed.DiTrackInfra;
import fr.sncf.osrd.new_infra.api.tracks.directed.DiTrackNode;
import fr.sncf.osrd.new_infra.api.tracks.directed.DiTrackObject;
import fr.sncf.osrd.new_infra.api.tracks.undirected.SwitchBranch;
import fr.sncf.osrd.new_infra.api.tracks.undirected.TrackEdge;
import fr.sncf.osrd.new_infra.api.tracks.undirected.TrackInfra;
import fr.sncf.osrd.new_infra.api.tracks.undirected.TrackNode;
import fr.sncf.osrd.utils.UnionFind;
import fr.sncf.osrd.utils.graph.EdgeEndpoint;
import java.util.*;

public class Parser {
    /** Map from undirected node to directed node (forward) */
    private final HashMap<TrackNode, DiTrackNode> forwardNodeMap = new HashMap<>();
    /** Map from undirected node to directed node (backward) */
    private final HashMap<TrackNode, DiTrackNode> backwardNodeMap = new HashMap<>();
    /** Reference undirected graph*/
    private final ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph;
    /** Reference undirected infra */
    private final TrackInfra trackInfra;
    /** Union find used to link directed nodes together*/
    private final UnionFind uf;
    /** Output graph builder */
    private final ImmutableNetwork.Builder<DiTrackNode, DiTrackEdge> graph;

    /** Constructor */
    private Parser(TrackInfra infra) {
        this.undirectedGraph = infra.getTrackGraph();
        uf = new UnionFind(undirectedGraph.edges().size() * 4);
        graph = NetworkBuilder.directed().immutable();
        trackInfra = infra;
    }

    /** Builds a directed infra from an undirected infra */
    public static DiTrackInfra fromUndirected(TrackInfra infra) {
        return new Parser(infra).convert();
    }

    /** Private function to call to convert the infra, with everything initialized */
    private DiTrackInfra convert() {

        // Creates the nodes
        for (var node : undirectedGraph.nodes()) {
            for (var direction : Direction.values()) {
                var newNode = new DiTrackNode(node, direction);
                getMap(direction).put(node, newNode);
                graph.addNode(newNode);
            }
        }

        // Links the tracks together using the union find
        for (var edge : undirectedGraph.edges()) {
            for (var direction : Direction.values()) {
                for (var adjacent : adjacentEdges(undirectedGraph, edge, endEndpoint(direction))) {
                    if (canGoFromAToB(edge, adjacent)) {
                        linkEdges(edge, adjacent, nodeFromEdgeEndpoint(undirectedGraph, edge, endEndpoint(direction)));
                    }
                }
            }
        }
        // Creates the edges and build the graph
        makeEdges();
        return new DiTrackInfraImpl(trackInfra, graph.build());
    }

    /** Builds every directed edge and registers them in the graph builder */
    private void makeEdges() {
        var nodes = HashBiMap.<Integer, DiTrackNode>create();
        for (var edge : undirectedGraph.edges()) {
            for (var dir : Direction.values()) {
                makeEdge(nodes, edge, dir);
            }
        }
    }

    private void makeEdge(HashBiMap<Integer, DiTrackNode> nodes, TrackEdge edge, Direction dir) {
        var begin = findNode(nodes, edge, dir, endEndpoint(dir.opposite()));
        var end = findNode(nodes, edge, dir, endEndpoint(dir));
        var newEdge = new DiTrackEdgeImpl(edge, dir);
        graph.addEdge(begin, end, newEdge);
        var waypoints = edge.getAttrs().getAttr(TRACK_OBJECTS, List.of());
        var orientedWaypoints = new ArrayList<DiTrackObject>();
        for (var w : waypoints) {
            var offset = w.getOffset();
            if (dir == Direction.BACKWARD) {
                offset = w.getTrackSection().getLength() - offset;
            }
            orientedWaypoints.add(new DiTrackObject(w, offset, dir));
        }
        orientedWaypoints.sort(Comparator.comparingDouble(DiTrackObject::offset));
        newEdge.getAttrs().putAttr(ORIENTED_TRACK_OBJECTS, orientedWaypoints);
    }

    /** Finds the node matching the edge / endpoint / direction.
     * If one matching the union is already picked, returns the same.
     * Otherwise, picks any unused direction for the node */
    private DiTrackNode findNode(HashBiMap<Integer, DiTrackNode> nodes, TrackEdge edge,
                                 Direction dir, EdgeEndpoint endpoint) {
        var group = uf.findRoot(getEndpointGroup(edge, dir, endpoint));
        if (nodes.containsKey(group))
            return nodes.get(group);
        var node = nodeFromEdgeEndpoint(undirectedGraph, edge, endpoint);
        var diNode = getMap(Direction.FORWARD).get(node);
        if (nodes.containsValue(diNode))
            diNode = getMap(Direction.BACKWARD).get(node);
        assert !nodes.containsValue(diNode);
        nodes.put(group, diNode);
        return diNode;
    }

    /** Links two edges across the given node, registering it in the union find */
    private void linkEdges(TrackEdge a, TrackEdge b, TrackNode node) {
        var endpointA = endpointOfNode(undirectedGraph, a, node);
        var endpointB = endpointOfNode(undirectedGraph, b, node);
        var invertedDirection = endpointA == endpointB;
        for (var direction : Direction.values()) {
            var otherDirection = invertedDirection ? direction.opposite() : direction;
            uf.union(
                    getEndpointGroup(a, direction, endpointA),
                    getEndpointGroup(b, otherDirection, endpointB)
            );
        }
    }

    /** Returns the union find ID for the given (edge, direction, endpoint) */
    private int getEndpointGroup(TrackEdge edge, Direction direction, EdgeEndpoint endpoint) {
        return edge.getAttrs().getAttrOrThrow(INDEX) * 4
                + (direction == Direction.FORWARD ? 2 : 0)
                + (endpoint == EdgeEndpoint.END ? 1 : 0);
    }

    /** Is the edge a switch branch */
    private static boolean isSwitchBranch(TrackEdge edge) {
        return edge instanceof SwitchBranch;
    }

    /** Returns whether we can link the two edges together */
    private static boolean canGoFromAToB(TrackEdge a, TrackEdge b) {
        return (!isSwitchBranch(a)) || (!isSwitchBranch(b));
    }

    /** Returns either (node -> directed node) map matching the given direction */
    private HashMap<TrackNode, DiTrackNode> getMap(Direction dir) {
        if (dir == Direction.FORWARD)
            return forwardNodeMap;
        else
            return backwardNodeMap;
    }
}
