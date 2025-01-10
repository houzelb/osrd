package fr.sncf.osrd.envelope_sim.etcs

/**
 * National Default Value: permission to inhibit the compensation of the speed measurement accuracy
 */
const val qNvinhsmicperm = false

const val dvEbiMin = 7.5 / 3.6 // m/s
const val dvEbiMax = 15.0 / 3.6 // m/s
const val vEbiMin = 110.0 / 3.6 // m/s
const val vEbiMax = 210.0 / 3.6 // m/s

const val vMin = 4.0 / 3.6 // m/s, corresponds to dvWarning, is used as a min ceiling speed for SVL

// Estimated acceleration during tBerem, worst case scenario (aEst2 is between 0 and 0.4),
// expressed in m/s²
const val aEst2 = 0.4

/** See Subset referenced in ETCSBrakingSimulator: table in Appendix A.3.1. */
const val tWarning = 2.0 // s
const val tDriver = 4.0 // s
const val mRotatingMax = 15.0 // %
const val mRotatingMin = 2.0 // %

fun vUra(speed: Double): Double {
    return if (speed <= 30 / 3.6) 2 / 3.6
    // vUra(30km/h) = 2km/h & vUra(500km/h) = 12km/h with a linear interpolation in between
    // this gives the following equation : y = (x + 64) / 47, still in km/h
    else ((speed + 64) / 47) / 3.6
}

fun vDelta0(speed: Double): Double {
    return if (!qNvinhsmicperm) vUra(speed) else 0.0
}

fun dvEbi(speed: Double): Double {
    return if (speed <= vEbiMin) dvEbiMin
    else if (speed < vEbiMax)
        (dvEbiMax - dvEbiMin) / (vEbiMax - vEbiMin) * (speed - vEbiMin) + dvEbiMin
    else dvEbiMax
}
