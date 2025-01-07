package fr.sncf.osrd.envelope_sim.etcs

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.envelope_sim.PhysicsPath
import fr.sncf.osrd.envelope_sim.PhysicsRollingStock
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.sim_infra.api.TravelledPath
import fr.sncf.osrd.utils.units.Offset

interface ETCSBrakingSimulator {
    val path: PhysicsPath
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
    val offsetEOA: Offset<TravelledPath>,
    val offsetSVL: Offset<TravelledPath>?,
) {
    init {
        if (offsetSVL != null) assert(offsetSVL >= offsetEOA)
    }
}

class ETCSBrakingSimulatorImpl(
    override val path: PhysicsPath,
    override val rollingStock: PhysicsRollingStock,
    override val timeStep: Double
) : ETCSBrakingSimulator {

    override fun addETCSBrakingParts(
        mrsp: Envelope,
        limitsOfAuthority: Collection<LimitOfAuthority>,
        endsOfAuthority: Collection<EndOfAuthority>
    ): Envelope {
        if (limitsOfAuthority.isEmpty() && endsOfAuthority.isEmpty()) return mrsp
        TODO("Not yet implemented")
    }
}
