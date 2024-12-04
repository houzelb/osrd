package fr.sncf.osrd.envelope_sim.pipelines

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.envelope.EnvelopeCursor
import fr.sncf.osrd.envelope.OverlayEnvelopeBuilder
import fr.sncf.osrd.envelope.part.ConstrainedEnvelopePartBuilder
import fr.sncf.osrd.envelope.part.EnvelopePartBuilder
import fr.sncf.osrd.envelope.part.constraints.EnvelopeConstraint
import fr.sncf.osrd.envelope.part.constraints.EnvelopePartConstraintType
import fr.sncf.osrd.envelope.part.constraints.SpeedConstraint
import fr.sncf.osrd.envelope_sim.EnvelopeProfile
import fr.sncf.osrd.envelope_sim.EnvelopeSimContext
import fr.sncf.osrd.envelope_sim.StopMeta
import fr.sncf.osrd.envelope_sim.TrainPhysicsIntegrator
import fr.sncf.osrd.envelope_sim.etcs.ETCSBrakingSimulator
import fr.sncf.osrd.envelope_sim.etcs.ETCSBrakingSimulatorImpl
import fr.sncf.osrd.envelope_sim.etcs.EndOfAuthority
import fr.sncf.osrd.envelope_sim.etcs.LimitOfAuthority
import fr.sncf.osrd.envelope_sim.overlays.EnvelopeDeceleration
import fr.sncf.osrd.reporting.exceptions.OSRDError
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.meters

/**
 * Max speed envelope = MRSP + braking curves It is the max speed allowed at any given point,
 * ignoring allowances
 */
object MaxSpeedEnvelope {

    /**
     * Simple data class for easier processing, local to this file. Combines the stop offset with
     * the "etcs" flag.
     */
    private data class SimStop(
        val offset: Double,
        val isETCS: Boolean,
        val index: Int, // Index in the stop list
    )

    fun increase(prevPos: Double, prevSpeed: Double, nextPos: Double, nextSpeed: Double): Boolean {
        // Works for both accelerations (forwards) and decelerations (backwards)
        return prevSpeed < nextSpeed
    }

    /**
     * Generate braking curves overlay everywhere the mrsp decrease (increase backwards) with a
     * discontinuity
     */
    private fun addBrakingCurves(
        etcsSimulator: ETCSBrakingSimulator,
        context: EnvelopeSimContext,
        mrsp: Envelope
    ): Envelope {
        var envelope = mrsp
        envelope = addETCSBrakingCurves(etcsSimulator, context, envelope)
        val builder = OverlayEnvelopeBuilder.backward(envelope)
        val cursor = EnvelopeCursor.backward(envelope)
        var lastPosition = envelope.endPos
        while (cursor.findPartTransition(MaxSpeedEnvelope::increase)) {
            if (cursor.getPosition() > lastPosition) {
                // The next braking curve already covers this point, this braking curve is hidden
                cursor.nextPart()
                continue
            }
            val partBuilder = EnvelopePartBuilder()
            partBuilder.setAttr<EnvelopeProfile>(EnvelopeProfile.BRAKING)
            val overlayBuilder =
                ConstrainedEnvelopePartBuilder(
                    partBuilder,
                    SpeedConstraint(0.0, EnvelopePartConstraintType.FLOOR),
                    EnvelopeConstraint(envelope, EnvelopePartConstraintType.CEILING)
                )
            val startSpeed = cursor.getSpeed()
            val startPosition = cursor.getPosition()
            // TODO: link directionSign to cursor boolean reverse
            EnvelopeDeceleration.decelerate(
                context,
                startPosition,
                startSpeed,
                overlayBuilder,
                -1.0
            )
            builder.addPart(partBuilder.build())
            cursor.nextPart()
            lastPosition = overlayBuilder.lastPos
        }
        return builder.build()
    }

    /** Add braking curves following ETCS rules in relevant places */
    private fun addETCSBrakingCurves(
        etcsSimulator: ETCSBrakingSimulator,
        context: EnvelopeSimContext,
        envelope: Envelope
    ): Envelope {
        val etcsRanges = context.etcsContext?.brakingRanges ?: return envelope
        val cursor = EnvelopeCursor.backward(envelope)
        val limitsOfAuthority = mutableListOf<LimitOfAuthority>()
        while (cursor.findPartTransition(MaxSpeedEnvelope::increase)) {
            val offset = Offset<Path>(cursor.position.meters)
            if (etcsRanges.contains(offset.distance)) {
                limitsOfAuthority.add(
                    LimitOfAuthority(
                        offset,
                        cursor.speed,
                    )
                )
            }
        }
        return etcsSimulator.addETCSBrakingParts(envelope, limitsOfAuthority, listOf())
    }

    /** Generate braking curves overlay at every stop position */
    private fun addStopBrakingCurves(
        etcsSimulator: ETCSBrakingSimulator,
        context: EnvelopeSimContext,
        stopPositions: DoubleArray,
        curveWithDecelerations: Envelope
    ): Envelope {
        var envelope = curveWithDecelerations
        val stops = makeSimStops(context, stopPositions, envelope)
        envelope = addETCSStops(etcsSimulator, context, envelope, stops)
        for (stop in stops) {
            if (stop.isETCS) continue // Already handled
            val partBuilder = EnvelopePartBuilder()
            partBuilder.setAttr<EnvelopeProfile>(EnvelopeProfile.BRAKING)
            partBuilder.setAttr<StopMeta>(StopMeta(stop.index))
            val overlayBuilder =
                ConstrainedEnvelopePartBuilder(
                    partBuilder,
                    SpeedConstraint(0.0, EnvelopePartConstraintType.FLOOR),
                    EnvelopeConstraint(envelope, EnvelopePartConstraintType.CEILING)
                )
            EnvelopeDeceleration.decelerate(context, stop.offset, 0.0, overlayBuilder, -1.0)

            val builder = OverlayEnvelopeBuilder.backward(envelope)
            builder.addPart(partBuilder.build())
            envelope = builder.build()
        }
        return envelope
    }

    /** Add braking parts for any ETCS flagged stop. */
    private fun addETCSStops(
        simulator: ETCSBrakingSimulator,
        context: EnvelopeSimContext,
        envelope: Envelope,
        stops: List<SimStop>
    ): Envelope {
        val endsOfAuthority =
            stops
                .filter { it.isETCS }
                .map { EndOfAuthority(Offset(it.offset.meters), getDangerPoint(context, it)) }
        return simulator.addETCSBrakingParts(envelope, listOf(), endsOfAuthority)
    }

    /**
     * Returns the SVL location: next buffer stop or switch, whichever is closest. If there is any.
     */
    private fun getDangerPoint(context: EnvelopeSimContext, stop: SimStop): Offset<Path>? {
        val etcsContext = context.etcsContext!!
        return etcsContext.dangerPointOffsets.firstOrNull { it.distance.meters >= stop.offset }
    }

    /**
     * Converts the raw double offsets into a data class with some metadata. Handles some of the
     * input checking (such as invalid offsets).
     */
    private fun makeSimStops(
        context: EnvelopeSimContext,
        stopOffsets: DoubleArray,
        envelope: Envelope
    ): List<SimStop> {
        val res = mutableListOf<SimStop>()
        for ((i, stopOffset) in stopOffsets.withIndex()) {
            if (stopOffset == 0.0) continue
            val isETCS = context.etcsContext?.brakingRanges?.contains(stopOffset.meters) ?: false
            var offset = stopOffset
            if (offset > envelope.endPos) {
                if (TrainPhysicsIntegrator.arePositionsEqual(offset, envelope.endPos))
                    offset = envelope.endPos
                else throw OSRDError.newEnvelopeError(i, offset, envelope.endPos)
            }
            res.add(SimStop(offset, isETCS, i))
        }
        return res
    }

    /** Generate a max speed envelope given a mrsp */
    @JvmStatic
    fun from(context: EnvelopeSimContext, stopPositions: DoubleArray, mrsp: Envelope): Envelope {
        val etcsSimulator =
            ETCSBrakingSimulatorImpl(context.path, context.rollingStock, context.timeStep)
        var maxSpeedEnvelope = addBrakingCurves(etcsSimulator, context, mrsp)
        maxSpeedEnvelope =
            addStopBrakingCurves(etcsSimulator, context, stopPositions, maxSpeedEnvelope)
        return maxSpeedEnvelope
    }
}
