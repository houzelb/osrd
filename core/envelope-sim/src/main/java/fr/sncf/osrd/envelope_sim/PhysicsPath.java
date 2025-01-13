package fr.sncf.osrd.envelope_sim;

public interface PhysicsPath {
    /** The length of the path, in meters */
    double getLength();

    /** The average slope on a given range, in m/km */
    double getAverageGrade(double begin, double end);

    /** The lowest slope on a given range, in m/km */
    double getMinGrade(double begin, double end);
}
