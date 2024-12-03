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
import fr.sncf.osrd.envelope_sim.overlays.EnvelopeDeceleration
import fr.sncf.osrd.reporting.exceptions.OSRDError

/**
 * Max speed envelope = MRSP + braking curves It is the max speed allowed at any given point,
 * ignoring allowances
 */
object MaxSpeedEnvelope {
    fun increase(prevPos: Double, prevSpeed: Double, nextPos: Double, nextSpeed: Double): Boolean {
        // Works for both accelerations (forwards) and decelerations (backwards)
        return prevSpeed < nextSpeed
    }

    /**
     * Generate braking curves overlay everywhere the mrsp decrease (increase backwards) with a
     * discontinuity
     */
    private fun addBrakingCurves(context: EnvelopeSimContext, mrsp: Envelope): Envelope {
        val builder = OverlayEnvelopeBuilder.backward(mrsp)
        val cursor = EnvelopeCursor.backward(mrsp)
        var lastPosition = mrsp.endPos
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
                    EnvelopeConstraint(mrsp, EnvelopePartConstraintType.CEILING)
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

    /** Generate braking curves overlay at every stop position */
    private fun addStopBrakingCurves(
        context: EnvelopeSimContext,
        stopPositions: DoubleArray,
        curveWithDecelerations: Envelope
    ): Envelope {
        var curveWithDecelerations = curveWithDecelerations
        for (i in stopPositions.indices) {
            var stopPosition = stopPositions[i]
            // if the stopPosition is zero, no need to build a deceleration curve
            if (stopPosition == 0.0) continue
            if (stopPosition > curveWithDecelerations.endPos) {
                if (
                    TrainPhysicsIntegrator.arePositionsEqual(
                        stopPosition,
                        curveWithDecelerations.endPos
                    )
                )
                    stopPosition = curveWithDecelerations.endPos
                else
                    throw OSRDError.newEnvelopeError(i, stopPosition, curveWithDecelerations.endPos)
            }
            val partBuilder = EnvelopePartBuilder()
            partBuilder.setAttr<EnvelopeProfile>(EnvelopeProfile.BRAKING)
            partBuilder.setAttr<StopMeta>(StopMeta(i))
            val overlayBuilder =
                ConstrainedEnvelopePartBuilder(
                    partBuilder,
                    SpeedConstraint(0.0, EnvelopePartConstraintType.FLOOR),
                    EnvelopeConstraint(curveWithDecelerations, EnvelopePartConstraintType.CEILING)
                )
            EnvelopeDeceleration.decelerate(context, stopPosition, 0.0, overlayBuilder, -1.0)

            val builder = OverlayEnvelopeBuilder.backward(curveWithDecelerations)
            builder.addPart(partBuilder.build())
            curveWithDecelerations = builder.build()
        }
        return curveWithDecelerations
    }

    /** Generate a max speed envelope given a mrsp */
    @JvmStatic
    fun from(context: EnvelopeSimContext, stopPositions: DoubleArray, mrsp: Envelope): Envelope {
        var maxSpeedEnvelope = addBrakingCurves(context, mrsp)
        maxSpeedEnvelope = addStopBrakingCurves(context, stopPositions, maxSpeedEnvelope)
        return maxSpeedEnvelope
    }
}
