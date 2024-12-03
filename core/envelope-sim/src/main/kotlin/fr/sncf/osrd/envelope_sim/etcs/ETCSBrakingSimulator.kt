package fr.sncf.osrd.envelope_sim.etcs

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.envelope_sim.PhysicsRollingStock
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.sim_infra.api.PathProperties
import fr.sncf.osrd.utils.units.Offset

interface ETCSBrakingSimulator {
    val trainPath: PathProperties
    val rollingStock: PhysicsRollingStock
    val timeStep: Double

    /** Compute the ETCS braking envelope from the MRSP, for each LOA and EOA. */
    fun addETCSBrakingParts(
        mrsp: Envelope,
        limitsOfAuthority: Collection<LimitOfAuthority>,
        endsOfAuthority: Collection<EndOfAuthority>
    ): Envelope
}

data class LimitOfAuthority(
    val offset: Offset<Path>,
    val speed: Double,
) {
    init {
        assert(speed > 0)
    }
}

data class EndOfAuthority(
    val offsetEOA: Offset<Path>,
    val offsetSVL: Offset<Path>?,
) {
    init {
        if (offsetSVL != null) assert(offsetSVL >= offsetEOA)
    }
}

class ETCSBrakingSimulatorImpl(
    override val trainPath: PathProperties,
    override val rollingStock: PhysicsRollingStock,
    override val timeStep: Double
) : ETCSBrakingSimulator {

    override fun addETCSBrakingParts(
        mrsp: Envelope,
        limitsOfAuthority: Collection<LimitOfAuthority>,
        endsOfAuthority: Collection<EndOfAuthority>
    ): Envelope {
        TODO("Not yet implemented")
    }
}
