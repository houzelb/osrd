package fr.sncf.osrd.infra.detectorgraph;

import fr.sncf.osrd.utils.graph.AbstractNode;
import fr.sncf.osrd.utils.graph.EdgeDirection;

import java.util.ArrayList;

public class DetectorNode extends AbstractNode {
    /** List of neighbors seen when moving across the detector from the end of the track section to the beginning */
    public final ArrayList<TVDSectionPath> startToStopNeighbors = new ArrayList<>();

    /** List of neighbors seen when moving across the detector from the beginning of the track section to the end */
    public final ArrayList<TVDSectionPath> stopToStartNeighbors = new ArrayList<>();

    /** Returns the node's adjacency list, given a direction */
    public ArrayList<TVDSectionPath> getNeighbors(EdgeDirection dir) {
        if (dir == EdgeDirection.START_TO_STOP)
            return startToStopNeighbors;
        return stopToStartNeighbors;
    }
}
