package fr.sncf.osrd.envelope_sim.etcs

/**
 * Formulas are found in `SUBSET-026-3v400.pdf` from the file at
 * https://www.era.europa.eu/system/files/2023-09/index004_-_SUBSET-026_v400.zip and in
 * `SUBSET-041_v400.pdf` from the file at
 * https://www.era.europa.eu/system/files/2023-09/index014_-_SUBSET-041_v400.pdf
 */

/**
 * National Default Value: permission to inhibit the compensation of the speed measurement accuracy.
 * See Subset 026: table in Appendix A.3.2.
 */
const val qNvinhsmicperm = false

/**
 * Estimated acceleration during tBerem, worst case scenario (aEst2 is between 0 and 0.4), expressed
 * in m/s². See Subset 026: §3.13.9.3.2.9.
 */
const val aEst2 = 0.4

/** See Subset 026: table in Appendix A.3.1. */
const val dvEbiMin = 7.5 / 3.6 // m/s
const val dvEbiMax = 15.0 / 3.6 // m/s
const val vEbiMin = 110.0 / 3.6 // m/s
const val vEbiMax = 210.0 / 3.6 // m/s
const val tWarning = 2.0 // s
const val tDriver = 4.0 // s
const val mRotatingMax = 15.0 // %
const val mRotatingMin = 2.0 // %

/** See Subset 041: §5.3.1.2. */
const val vUraMinLimit = 30 / 3.6 // m/s
const val vUraMaxLimit = 500 / 3.6 // m/s
const val vUraMin = 2 / 3.6 // m/s
const val vUraMax = 12 / 3.6 // m/s

/** See Subset 041: §5.3.1.2. */
fun vUra(speed: Double): Double {
    return interpolateLinearSpeed(speed, vUraMinLimit, vUraMaxLimit, vUraMin, vUraMax)
}

/** See Subset 026: §3.13.9.3.2.10. */
fun vDelta0(speed: Double): Double {
    return if (!qNvinhsmicperm) vUra(speed) else 0.0
}

/** See Subset 026: §3.13.9.2.3. */
fun dvEbi(speed: Double): Double {
    return interpolateLinearSpeed(speed, vEbiMin, vEbiMax, dvEbiMin, dvEbiMax)
}

/**
 * The linear curve is the following: below minSpeedLimit = minSpeed, above maxSpeedLimit =
 * maxSpeed, in between is a linear curve. This method takes a speed input and converts it
 * accordingly.
 */
private fun interpolateLinearSpeed(
    speed: Double,
    minSpeedLimit: Double,
    maxSpeedLimit: Double,
    minSpeed: Double,
    maxSpeed: Double
): Double {
    return if (speed <= minSpeedLimit) minSpeed
    else if (speed < maxSpeedLimit)
        (maxSpeed - minSpeed) / (maxSpeedLimit - minSpeedLimit) * (speed - minSpeedLimit) + minSpeed
    else maxSpeed
}
