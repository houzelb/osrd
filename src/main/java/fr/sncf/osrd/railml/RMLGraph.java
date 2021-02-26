package fr.sncf.osrd.railml;

import fr.sncf.osrd.utils.graph.BiGraph;
import fr.sncf.osrd.utils.graph.EdgeEndpoint;

import java.util.List;

public class RMLGraph extends BiGraph<TrackNetElement> {
    @Override
    public List<NetRelation> getNeighbors(TrackNetElement edge, EdgeEndpoint endpoint) {
        if (endpoint == EdgeEndpoint.BEGIN)
            return edge.beginNetRelation;
        return edge.endNetRelation;
    }
}
