package fr.sncf.osrd.railjson.schema.infra.trackranges;

public class RJSCurve extends RJSBiDirectionalTrackRange {

    // Radius (m).
    public double radius;

    RJSCurve(double begin,
            double end,
            double radius
    ) {
        super(begin, end);
        this.radius = radius;
    }
}
