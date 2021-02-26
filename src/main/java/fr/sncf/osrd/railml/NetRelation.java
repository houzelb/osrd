package fr.sncf.osrd.railml;

import static fr.sncf.osrd.utils.graph.EdgeEndpoint.*;

import fr.sncf.osrd.infra.InvalidInfraException;
import fr.sncf.osrd.utils.graph.EdgeDirection;
import fr.sncf.osrd.utils.graph.EdgeEndpoint;
import fr.sncf.osrd.utils.graph.ApplicableDirections;
import fr.sncf.osrd.infra.railjson.schema.ID;
import fr.sncf.osrd.infra.railjson.schema.RJSTrackSection.EndpointID;
import fr.sncf.osrd.infra.railjson.schema.RJSTrackSectionLink;
import fr.sncf.osrd.utils.graph.IBiNeighbor;
import org.dom4j.Document;
import org.dom4j.Element;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

class NetRelation implements IBiNeighbor<TrackNetElement> {

    public final EdgeEndpoint beginEndpoint;
    public final TrackNetElement begin;
    public final EdgeEndpoint endEndpoint;
    public final TrackNetElement end;

    protected NetRelation(
            TrackNetElement begin,
            EdgeEndpoint beginEndpoint,
            TrackNetElement end,
            EdgeEndpoint endEndpoint
    ) {
        this.beginEndpoint = beginEndpoint;
        this.endEndpoint = endEndpoint;
        this.begin = begin;
        this.end = end;
    }

    public static NetRelation fromTrackSectionLink(
            RJSTrackSectionLink rjsTrackSectionLink,
            Map<String, NetElement> netElements
    ) throws InvalidInfraException {
        var begin = netElements.get(rjsTrackSectionLink.begin.section.id);
        var end = netElements.get(rjsTrackSectionLink.end.section.id);
        if (begin.getClass() != TrackNetElement.class || end.getClass() != TrackNetElement.class) {
            throw new InvalidInfraException("TrackSectionLink should link only TrackNetElement");
        }
        var beginTrack = (TrackNetElement) begin;
        var endTrack = (TrackNetElement) end;
        return new NetRelation(beginTrack, rjsTrackSectionLink.begin.endpoint,
                               endTrack, rjsTrackSectionLink.end.endpoint);
    }

    public static EdgeEndpoint parseCoord(String intrinsicCoord) {
        assert intrinsicCoord.equals("0") || intrinsicCoord.equals("1");
        if (intrinsicCoord.equals("0"))
            return BEGIN;
        return END;
    }

    public static EndpointID parseEndpoint(String elementID, String position) {
        return new EndpointID(new ID<>(elementID), parseCoord(position));
    }

    public static RJSTrackSectionLink parse(
            ApplicableDirections navigability,
            String positionOnA,
            String elementA,
            String positionOnB,
            String elementB
    ) {
        return new RJSTrackSectionLink(
                navigability,
                parseEndpoint(elementA, positionOnA),
                parseEndpoint(elementB, positionOnB)
        );
    }

    static Map<String, RJSTrackSectionLink> parse(Map<String, DescriptionLevel> descLevels, Document document) {
        var netRelations = new HashMap<String, RJSTrackSectionLink>();

        for (var netRelationNode : document.selectNodes("/railML/infrastructure/topology/netRelations/netRelation")) {
            var netRelation = (Element) netRelationNode;
            var navigabilityStr = netRelation.attributeValue("navigability").toUpperCase(Locale.ENGLISH);
            if (navigabilityStr.equals("NONE"))
                continue;

            var navigability = ApplicableDirections.valueOf(navigabilityStr);

            var id = netRelation.attributeValue("id");
            if (descLevels.get(id) != DescriptionLevel.MICRO)
                continue;

            var positionOnA = netRelation.attributeValue("positionOnA");
            var elementA = netRelation.valueOf("elementA/@ref");

            var positionOnB = netRelation.attributeValue("positionOnB");
            var elementB = netRelation.valueOf("elementB/@ref");

            netRelations.put(id, NetRelation.parse(navigability, positionOnA, elementA, positionOnB, elementB));
        }
        return netRelations;
    }

    @Override
    public TrackNetElement getEdge(TrackNetElement originEdge, EdgeDirection direction) {
        if (originEdge == begin)
            return end;
        return begin;
    }

    @Override
    public EdgeDirection getDirection(TrackNetElement originEdge, EdgeDirection direction) {
        if (originEdge == begin)
            return endEndpoint == BEGIN ? EdgeDirection.START_TO_STOP : EdgeDirection.STOP_TO_START;
        return beginEndpoint == BEGIN ? EdgeDirection.START_TO_STOP : EdgeDirection.STOP_TO_START;
    }
}
