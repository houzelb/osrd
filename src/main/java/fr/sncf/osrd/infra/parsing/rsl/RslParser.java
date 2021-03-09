package fr.sncf.osrd.infra.parsing.rsl;

import fr.sncf.osrd.infra.InvalidInfraException;
import fr.sncf.osrd.infra.graph.ApplicableDirections;
import fr.sncf.osrd.infra.parsing.railjson.schema.*;
import fr.sncf.osrd.util.XmlNamespaceCleaner;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;
import java.util.ArrayList;
import java.util.HashMap;

public final class RslParser {
    /**
     * Initialises a new infrastructure from a Rsl file.
     *
     * @return the parsed infrastructure
     */
    public static RJSRoot parse(String inputPath) throws InvalidInfraException {
        Document document;
        try {
            document = new SAXReader().read(inputPath);
        } catch (DocumentException e) {
            throw new InvalidInfraException("invalid XML", e);
        }

        // remove xml namespace tags, as these prevent using xpath
        document.accept(new XmlNamespaceCleaner());

        // parse all pieces of track
        var edges = Edge.parseEdges(document);

        // create and fill the root RailJSON structure:
        // create a map of all edges connected to a given node
        var rjsTrackSections = new HashMap<String, RJSTrackSection>();
        var nodeMap = new HashMap<String, ArrayList<Edge>>();
        for (var edge : edges) {
            rjsTrackSections.put(edge.id, edge);
            createNodeMap(nodeMap, edge);
        }

        // create RailJSON switches and track section links
        var rjsTrackSectionLinks = new HashMap<String, RJSTrackSectionLink>();
        var rjsSwitches = switchParse(document, nodeMap, rjsTrackSectionLinks);

        // create track section links for all the nodes not being switches
        for (var entry : nodeMap.entrySet()) {
            var neighbors = entry.getValue();
            if (neighbors.size() > 2)
                continue;
            addTrackSectionLinks(neighbors.get(0), neighbors.get(1),
                    entry.getKey(), rjsTrackSectionLinks);
        }

        var rjsOperationalPoints = timingPointsParse(document, rjsTrackSections, nodeMap);
        var rjsSpeedSections = speedIndicatorsParse(document, rjsTrackSections);
        var rjsTvdSections = tvdSectionsParse();

        return new RJSRoot(
                rjsTrackSections.values(),
                rjsTrackSectionLinks.values(),
                rjsSwitches,
                rjsOperationalPoints,
                rjsTvdSections,
                rjsSpeedSections
        );
    }

    /**
     * Create the track section link and add to a map
     *
     * */
    private static void addTrackSectionLinks(Edge edge, Edge edge1, String nodeID,
                                             HashMap<String, RJSTrackSectionLink> rjsTrackSectionLinks) {
        var firstTrack = edge;
        var secondTrack = edge1;
        var endPoint = findEndpoint(edge, nodeID);
        if (endPoint.endpoint.equals("BEGIN")) {
            firstTrack = edge1;
            secondTrack = edge;
        }
        var id = String.join("-", firstTrack.getID(), secondTrack.getID());
        var navigability = findLinkNavigability(firstTrack, secondTrack);
        rjsTrackSectionLinks.put(id,
                new RJSTrackSectionLink(navigability, firstTrack.endEndpoint(), secondTrack.beginEndpoint()));
    }

    /**
     * Read the block sections from a Rsl file
     *
     * @return the TVD sections list for RJS
     */
    private static ArrayList<RJSTVDSection> tvdSectionsParse() {
        ArrayList<RJSTVDSection> rjsTvdSections = new ArrayList<RJSTVDSection>();
        return rjsTvdSections;
    }

    /**
     * Read the speed indicators from a Rsl file
     *
     * @return the Speed sections list for RJS
     */
    private static ArrayList<RJSSpeedSection> speedIndicatorsParse(Document document,
                                                                   HashMap<String, RJSTrackSection> rjsTrackSections) {
        var speedSections = new ArrayList<RJSSpeedSection>();
        for (var node : document.selectNodes("/line/nodes/speedIndicator")) {
            var speedIndicatorNode = (Element) node;

        }
        return speedSections;
    }

    /**
     * Read the time points from a Rsl file
     *
     * @return the operational points list for RJS
     */
    private static ArrayList<RJSOperationalPoint> timingPointsParse(Document document,
                                                                     HashMap<String, RJSTrackSection> rjsTrackSections,
                                                                     HashMap<String, ArrayList<Edge>> nodeMap) {
        var operationalPoints = new ArrayList<RJSOperationalPoint>();
        for (var node : document.selectNodes("/line/nodes/track")) {
            var trackNode = (Element) node;
            // create the operational point
            if (trackNode.attributeValue("type") == "timingPoint") {
                var id = trackNode.attributeValue("NodeID");
                var rjsOperationalPoint = new RJSOperationalPoint(id);
                var operationalPointID = ID.from(rjsOperationalPoint);
                operationalPoints.add(rjsOperationalPoint);

                // link tracks sections back to the operational point
            }
        }
        return operationalPoints;
    }

    /**
     * Read the switches from a Rsl file
     *
     * @return the switches list for RJS
     */
    private static ArrayList<RJSSwitch> switchParse(Document document, HashMap<String, ArrayList<Edge>> nodeMap,
             HashMap<String, RJSTrackSectionLink> trackSectionLinks) {
        var switches = new ArrayList<RJSSwitch>();

        for (var node : document.selectNodes("/line/nodes/switch")) {
            var switchNode = (Element) node;
            var id = switchNode.attributeValue("nodeID");
            var baseBranchNodeID = Integer.getInteger(switchNode.attributeValue("start"));

            var baseTrackSection = findBase(nodeMap, id, baseBranchNodeID);
            var otherTrackSections = findOthers(nodeMap, id, baseTrackSection);
            var base = findEndpoint(baseTrackSection, id);
            var left = findEndpoint(otherTrackSections.get(0), id);
            var right = findEndpoint(otherTrackSections.get(1), id);
            var rjsSwitch = new RJSSwitch(id, base, left, right);
            switches.add(rjsSwitch);

            //create 2 track section links for each switch: base/right, base/left
            addTrackSectionLinks(baseTrackSection, otherTrackSections.get(0), id, trackSectionLinks);
            addTrackSectionLinks(baseTrackSection, otherTrackSections.get(1), id, trackSectionLinks);
        }
        return switches;
    }

    /**
     * Check if one of the tracks sections is not bidirectional
     *
     * @return the navigability of the link
     */
    private static ApplicableDirections findLinkNavigability(Edge section, Edge section1) {
        ApplicableDirections navigability = ApplicableDirections.BOTH;
        if ((!section.getBidirectional().equals("true")) || (!section1.getBidirectional().equals("true")))
            navigability = ApplicableDirections.NORMAL;
        return navigability;
    }

    /**
     * Find the two tracks not being the base track of the switch
     */
    private static ArrayList<Edge> findOthers(HashMap<String,
            ArrayList<Edge>> nodeMap, String id, Edge baseTrackSection) {
        ArrayList<Edge> others = null;
        for (var edge : nodeMap.get(id)) {
            if (!edge.equals(baseTrackSection)) others.add(edge);
        }
        return others;
    }

    /**
     * Find the base track of the switch
     */
    private static Edge findBase(HashMap<String, ArrayList<Edge>> nodeMap, String id, Integer baseBranchNodeID) {
        Edge baseEdge = null;
        for (var edge : nodeMap.get(id)) {
            if ((edge.beginEndpoint().endpoint.id == baseBranchNodeID)
                    || (edge.endEndpoint().endpoint.id == baseBranchNodeID)) {
                baseEdge = edge;
                break;
            }
        }
        return baseEdge;
    }

    /**
     * Find the EndPoint of the track section corresponding to a node
     */
    private static RJSTrackSection.EndpointID findEndpoint(Edge trackSection, String nomeID) {
        var id = Integer.getInteger(nomeID);
        if (trackSection.beginEndpoint().endpoint.id == id)
            return trackSection.beginEndpoint();
        return trackSection.endEndpoint();
    }

    /**
     * Put the edge twice in the nodeMap with startNodeID and endNodeID as keys
     */
    private static void createNodeMap(HashMap<String, ArrayList<Edge>> nodeMap, Edge edge) {
        var startNodeID = String.valueOf(edge.beginEndpoint().endpoint.id);
        var endNodeID = String.valueOf(edge.endEndpoint().endpoint.id);

        for (var node : new String[]{ startNodeID, endNodeID }) {
            var neighbors = nodeMap.get(node);
            if (neighbors == null) {
                var relatedTrackSections = new ArrayList<Edge>();
                relatedTrackSections.add(edge);
                nodeMap.put(node, relatedTrackSections);
            } else {
                neighbors.add(edge);
            }
        }
    }
}


