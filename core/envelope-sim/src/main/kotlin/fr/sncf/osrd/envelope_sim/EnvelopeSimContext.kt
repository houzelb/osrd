package fr.sncf.osrd.envelope_sim

import com.google.common.collect.RangeMap
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.utils.DistanceRangeSet
import fr.sncf.osrd.utils.units.Offset

class EnvelopeSimContext
@JvmOverloads
constructor(
    @JvmField val rollingStock: PhysicsRollingStock,
    @JvmField val path: PhysicsPath,
    @JvmField val timeStep: Double,
    @JvmField
    val tractiveEffortCurveMap: RangeMap<Double, Array<PhysicsRollingStock.TractiveEffortPoint>>,
    /** If the train should follow ETCS rules, this contains some extra context */
    val etcsContext: ETCSContext? = null,
) {

    data class ETCSContext(
        /** Braking curves are computing using ETCS rules when they end in these ranges. */
        val brakingRanges: DistanceRangeSet,
        /**
         * List of switch and buffer stops offsets on the path, up to the first switch/buffer stop
         * *after* the end of the path (or right at the end).
         */
        val dangerPointOffsets: List<Offset<Path>>,
    )

    /** Creates a context suitable to run simulations on envelopes */
    init {
        checkNotNull(tractiveEffortCurveMap)
    }

    fun updateCurves(
        tractiveEffortCurveMap: RangeMap<Double, Array<PhysicsRollingStock.TractiveEffortPoint>>
    ): EnvelopeSimContext {
        return EnvelopeSimContext(rollingStock, path, timeStep, tractiveEffortCurveMap)
    }
}
