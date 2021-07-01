package fr.sncf.osrd;

import fr.sncf.osrd.infra.routegraph.Route;
import fr.sncf.osrd.train.TrackSectionRange;
import fr.sncf.osrd.train.TrainPath;
import fr.sncf.osrd.train.decisions.TrainDecisionMaker;
import fr.sncf.osrd.train.phases.Phase;
import fr.sncf.osrd.utils.TrackSectionLocation;
import fr.sncf.osrd.utils.graph.EdgeDirection;

import java.util.ArrayList;

public final class TrainSchedule {
    public final String trainID;
    public final RollingStock rollingStock;

    public final double departureTime;

    public final TrackSectionLocation initialLocation;
    public final EdgeDirection initialDirection;
    public final Route initialRoute;
    public final double initialSpeed;

    public final ArrayList<Phase> phases;

    public final TrainDecisionMaker trainDecisionMaker;

    /** This is the *expected* path, eventually it may change in the TrainState copy */
    public final TrainPath plannedPath;

    /** Create a new train schedule */
    public TrainSchedule(
            String trainID,
            RollingStock rollingStock,
            double departureTime,
            TrackSectionLocation initialLocation,
            EdgeDirection initialDirection, Route initialRoute,
            double initialSpeed,
            ArrayList<Phase> phases,
            TrainDecisionMaker trainDecisionMaker
    ) {
        this.trainID = trainID;
        this.rollingStock = rollingStock;
        this.departureTime = departureTime;
        this.initialLocation = initialLocation;
        this.initialDirection = initialDirection;
        this.initialRoute = initialRoute;
        this.initialSpeed = initialSpeed;
        this.phases = phases;
        plannedPath = new TrainPath(this);
        if (trainDecisionMaker == null)
            trainDecisionMaker = new TrainDecisionMaker.DefaultTrainDecisionMaker();
        this.trainDecisionMaker = trainDecisionMaker;
    }

    /** Find location on track given a distance from the start.
     * If the path position is higher than the fullPath length the function return null. */
    public TrackSectionLocation findLocation(double pathPosition) {
        for (var track : plannedPath.trackSectionPath) {
            if (pathPosition <= track.length()) {
                var location = track.getBeginPosition();
                if (track.direction == EdgeDirection.START_TO_STOP)
                    location += pathPosition;
                else
                    location -= pathPosition;
                return new TrackSectionLocation(track.edge, location);
            }
            pathPosition -= track.length();
        }
        return null;
    }
}
