package fr.sncf.osrd.envelope_sim

import com.google.common.collect.RangeMap

class EnvelopeSimContext(
    @JvmField val rollingStock: PhysicsRollingStock,
    @JvmField val path: PhysicsPath,
    @JvmField val timeStep: Double,
    @JvmField
    val tractiveEffortCurveMap: RangeMap<Double, Array<PhysicsRollingStock.TractiveEffortPoint>>
) {
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
