package fr.sncf.osrd.ertms.etcs

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.sim_infra.api.PathProperties
import fr.sncf.osrd.train.RollingStock
import fr.sncf.osrd.utils.units.Offset

interface ETCSBrakingSimulator {
    val trainPath: PathProperties
    val rollingStock: RollingStock
    val timeStep: Double

    /**
     * Compute the ETCS braking envelope from the MRSP: for each decreasing speed transition,
     * compute the corresponding ETCS braking curve.
     */
    fun getETCSBrakingEnvelopeFromMrsp(mrsp: Envelope)

    /**
     * Compute the ETCS braking envelope from target: compute the corresponding ETCS braking curve
     * decreasing from rolling stock max speed and ending at target offset/speed-wise.
     */
    fun getETCSBrakingEnvelopeFromTarget(target: Target)
}

data class Target(
    val offset: Offset<Path>,
    val speed: Double,
    val type: TargetType = if (speed != 0.0) TargetType.SLOWDOWN else TargetType.STOP
)

enum class TargetType {
    SLOWDOWN,
    STOP
}

class ETCSBrakingSimulatorImpl(
    override val trainPath: PathProperties,
    override val rollingStock: RollingStock,
    override val timeStep: Double
) : ETCSBrakingSimulator {

    override fun getETCSBrakingEnvelopeFromMrsp(mrsp: Envelope) {
        TODO("Not yet implemented")
    }

    override fun getETCSBrakingEnvelopeFromTarget(target: Target) {
        TODO("Not yet implemented")
    }
}
