package fr.sncf.osrd.envelope_sim.etcs

import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.envelope.OverlayEnvelopeBuilder
import fr.sncf.osrd.envelope.part.ConstrainedEnvelopePartBuilder
import fr.sncf.osrd.envelope.part.EnvelopePart
import fr.sncf.osrd.envelope.part.EnvelopePartBuilder
import fr.sncf.osrd.envelope.part.constraints.EnvelopeConstraint
import fr.sncf.osrd.envelope.part.constraints.EnvelopePartConstraintType
import fr.sncf.osrd.envelope.part.constraints.PositionConstraint
import fr.sncf.osrd.envelope.part.constraints.SpeedConstraint
import fr.sncf.osrd.envelope_sim.*
import fr.sncf.osrd.envelope_sim.overlays.EnvelopeDeceleration
import kotlin.math.max
import kotlin.math.min

enum class BrakingCurveType {
    EBD, // Emergency Brake Deceleration
    EBI, // Emergency Brake Intervention
    SBD, // Service Brake Deceleration
    SBI, // Service Brake Intervention
    GUI, // Guidance
    PS, // Permitted Speed
    IND // Indication
}

enum class BrakingType {
    CONSTANT,
    ETCS_EBD,
    ETCS_SBD,
    ETCS_GUI
}

/** Compute braking curves at every end of authority. */
fun addBrakingCurvesAtEOAs(
    envelope: Envelope,
    context: EnvelopeSimContext,
    endsOfAuthority: Collection<EndOfAuthority>
): Envelope {
    val sortedEndsOfAuthority = endsOfAuthority.sortedBy { it.offsetEOA }
    var beginPos = 0.0
    val builder = OverlayEnvelopeBuilder.forward(envelope)
    for (endOfAuthority in sortedEndsOfAuthority) {
        val targetPosition = endOfAuthority.offsetEOA.distance.meters
        val targetSpeed = 0.0
        val overhead =
            Envelope.make(
                EnvelopePart.generateTimes(
                    listOf(EnvelopeProfile.CONSTANT_SPEED),
                    doubleArrayOf(beginPos, targetPosition),
                    doubleArrayOf(envelope.maxSpeed, envelope.maxSpeed)
                )
            )
        val guiCurve =
            computeBrakingCurve(
                context,
                overhead,
                beginPos,
                targetPosition,
                targetSpeed,
                BrakingType.ETCS_GUI
            )
        val sbdCurve =
            computeBrakingCurve(
                context,
                overhead,
                beginPos,
                targetPosition,
                targetSpeed,
                BrakingType.ETCS_SBD
            )
        val fullIndicationCurve =
            computeIndicationBrakingCurveFromRef(
                context,
                sbdCurve,
                BrakingCurveType.SBD,
                guiCurve,
                beginPos
            )
        val indicationCurve = keepBrakingCurveUnderOverlay(fullIndicationCurve, envelope, beginPos)

        if (endOfAuthority.offsetSVL != null && false) {
            // TODO: Make ebd go until envelope.maxSpeed + deltaVbec(envelope.maxSpeed, minGrade,
            // maxTractiveEffortCurve)
            // so that ebi will intersect with mrsp
            val ebdCurve =
                computeBrakingCurve(
                    context,
                    envelope,
                    beginPos,
                    endOfAuthority.offsetSVL.distance.meters,
                    targetSpeed,
                    BrakingType.ETCS_EBD
                )
            val ebiCurve = computeEbiBrakingCurveFromEbd(context, ebdCurve, beginPos, targetSpeed)
            val fullIndicationCurveSvl =
                computeIndicationBrakingCurveFromRef(
                    context,
                    ebiCurve,
                    BrakingCurveType.SBD,
                    guiCurve,
                    beginPos
                )
            val indicationCurveSvl =
                keepBrakingCurveUnderOverlay(fullIndicationCurveSvl, envelope, beginPos)
            // val intersectionVmin = indicationCurve.interpolateSpeed(vMin)
            // TODO: return min of the 2 indication curves: indicationCurveEOA and
            // indicationCurveSVL.
            //  If the foot of the min curve is reached before EOA, follow the min curve until
            // Constants.vMin,
            //  then maintain speed at Constants.vMin, then follow indicationCurveEOA whose foot is
            // the EOA.
            // indicationCurve = min(indicationCurve, indicationCurveSvl)
        }
        builder.addPart(indicationCurve)
        beginPos = targetPosition
    }
    return builder.build()
}

/** Compute braking curves at every limit of authority. */
fun addBrakingCurvesAtLOAs(
    envelope: Envelope,
    context: EnvelopeSimContext,
    limitsOfAuthority: Collection<LimitOfAuthority>
): Envelope {
    val sortedLimitsOfAuthority = limitsOfAuthority.sortedBy { it.offset }
    val beginPos = 0.0
    var envelopeWithLoaBrakingCurves = envelope
    var builder = OverlayEnvelopeBuilder.forward(envelopeWithLoaBrakingCurves)
    for (limitOfAuthority in sortedLimitsOfAuthority) {
        val targetPosition = limitOfAuthority.offset.distance.meters
        val targetSpeed = limitOfAuthority.speed
        val maxBecDeltaSpeed = maxBecDeltaSpeed()
        val overhead =
            Envelope.make(
                EnvelopePart.generateTimes(
                    listOf(EnvelopeProfile.CONSTANT_SPEED),
                    doubleArrayOf(beginPos, targetPosition),
                    doubleArrayOf(
                        envelope.maxSpeed + maxBecDeltaSpeed,
                        envelope.maxSpeed + maxBecDeltaSpeed
                    )
                )
            )
        val ebdCurve =
            computeBrakingCurve(
                context,
                overhead,
                beginPos,
                targetPosition,
                targetSpeed,
                BrakingType.ETCS_EBD
            )
        val guiCurve =
            computeBrakingCurve(
                context,
                overhead,
                beginPos,
                targetPosition,
                targetSpeed,
                BrakingType.ETCS_GUI
            )

        val ebiCurve = computeEbiBrakingCurveFromEbd(context, ebdCurve, beginPos, targetSpeed)
        assert(ebiCurve.beginPos == beginPos || ebiCurve.maxSpeed >= envelope.maxSpeed)

        val fullIndicationCurve =
            computeIndicationBrakingCurveFromRef(
                context,
                ebiCurve,
                BrakingCurveType.EBI,
                guiCurve,
                beginPos
            )
        val indicationCurve =
            keepBrakingCurveUnderOverlay(
                fullIndicationCurve,
                envelopeWithLoaBrakingCurves,
                beginPos
            )
        builder.addPart(indicationCurve)
        if (indicationCurve.endPos < targetPosition) {
            // Maintain target speed until target position, i.e. LOA
            val maintainTargetSpeedCurve =
                EnvelopePart.generateTimes(
                    listOf(EnvelopeProfile.CONSTANT_SPEED),
                    doubleArrayOf(indicationCurve.endPos, targetPosition),
                    doubleArrayOf(targetSpeed, targetSpeed)
                )
            builder.addPart(maintainTargetSpeedCurve)
        }
        envelopeWithLoaBrakingCurves = builder.build()
        builder = OverlayEnvelopeBuilder.forward(envelopeWithLoaBrakingCurves)
    }
    return envelopeWithLoaBrakingCurves
}

/** Compute braking curve: used to compute EBD, SBD or GUI. */
private fun computeBrakingCurve(
    context: EnvelopeSimContext,
    envelope: Envelope,
    beginPos: Double,
    targetPosition: Double,
    targetSpeed: Double,
    brakingType: BrakingType
): EnvelopePart {
    assert(
        brakingType == BrakingType.ETCS_EBD ||
            brakingType == BrakingType.ETCS_SBD ||
            brakingType == BrakingType.ETCS_GUI
    )
    // If the stopPosition is below begin position, the input is invalid
    // If the stopPosition is after the end of the path, the input is invalid except if it is an
    // SVL, i.e. the target speed is 0 and the curve to compute is an EBD
    if (
        targetPosition <= beginPos ||
            (targetPosition > context.path.length &&
                targetSpeed == 0.0 &&
                brakingType != BrakingType.ETCS_EBD)
    )
        throw RuntimeException(
            String.format(
                "Trying to compute ETCS braking curve from out of bounds ERTMS end/limit of authority: %s",
                targetPosition
            )
        )
    val partBuilder = EnvelopePartBuilder()
    partBuilder.setAttr(EnvelopeProfile.BRAKING)
    val overlayBuilder =
        ConstrainedEnvelopePartBuilder(
            partBuilder,
            PositionConstraint(beginPos, targetPosition),
            SpeedConstraint(targetSpeed, EnvelopePartConstraintType.FLOOR),
            EnvelopeConstraint(envelope, EnvelopePartConstraintType.CEILING)
        )
    EnvelopeDeceleration.decelerate(
        context,
        targetPosition,
        targetSpeed,
        overlayBuilder,
        -1.0,
        brakingType
    )
    var brakingCurve = partBuilder.build()

    if (brakingType == BrakingType.ETCS_EBD && targetSpeed != 0.0) {
        // TODO: by doing this, there is an approximation on the gradient used. TBD at a later date.
        // When target is an LOA, EBD reaches target position at target speed + dVEbi: shift
        // envelope to make it so
        val dvEbi = dvEbi(targetSpeed)
        val intersection = brakingCurve.interpolatePosition(targetSpeed + dvEbi)
        brakingCurve =
            brakingCurve.copyAndShift(targetPosition - intersection, 0.0, Double.POSITIVE_INFINITY)
    }

    return brakingCurve
}

/** Compute EBI curve from EBD curve. Resulting EBI stops at target speed. */
private fun computeEbiBrakingCurveFromEbd(
    context: EnvelopeSimContext,
    ebdCurve: EnvelopePart,
    beginPos: Double,
    targetSpeed: Double
): EnvelopePart {
    val reversedNewPos = ArrayList<Double>()
    val reversedNewSpeeds = ArrayList<Double>()
    var reversedNewPosIndex = 0
    for (i in ebdCurve.pointCount() - 1 downTo 0) {
        val speed = ebdCurve.getPointSpeed(i)
        val deltaPosAndDeltaSpeed =
            computeBecDeltaPosAndSpeed(context, ebdCurve, speed, targetSpeed)
        val deltaPos = deltaPosAndDeltaSpeed.component1()
        val deltaSpeed = deltaPosAndDeltaSpeed.component2()
        val newPos = ebdCurve.getPointPos(i) - deltaPos
        val newSpeed = speed - deltaSpeed
        if (newSpeed < 0) continue
        if (newPos >= beginPos) {
            reversedNewPos.add(newPos)
            reversedNewSpeeds.add(newSpeed)
            reversedNewPosIndex++
        } else {
            assert(reversedNewPosIndex > 0 && reversedNewPos[reversedNewPosIndex - 1] > beginPos)
            // Interpolate to begin position if reaching a position before it
            val prevPos = reversedNewPos[reversedNewPosIndex - 1]
            val prevSpeed = reversedNewSpeeds[reversedNewPosIndex - 1]
            val speedAtBeginPos =
                prevSpeed + (beginPos - prevPos) * (newSpeed - prevSpeed) / (newPos - prevPos)
            reversedNewPos.add(beginPos)
            reversedNewSpeeds.add(speedAtBeginPos)
            break
        }
    }

    val nbPoints = reversedNewPos.size
    val newPosArray = DoubleArray(nbPoints)
    val newSpeedsArray = DoubleArray(nbPoints)
    for (i in newPosArray.indices) {
        newPosArray[i] = reversedNewPos[nbPoints - 1 - i]
        newSpeedsArray[i] = reversedNewSpeeds[nbPoints - 1 - i]
    }
    val fullBrakingCurve =
        EnvelopePart.generateTimes(listOf(EnvelopeProfile.BRAKING), newPosArray, newSpeedsArray)

    // Make EBI stop at target speed
    val intersection = fullBrakingCurve.interpolatePosition(targetSpeed)
    return fullBrakingCurve.sliceWithSpeeds(
        fullBrakingCurve.beginPos,
        fullBrakingCurve.beginSpeed,
        intersection,
        targetSpeed
    )
}

/**
 * Compute Indication curve: EBI/SBD -> SBI -> PS -> IND. See Subset referenced in
 * ETCSBrakingSimulator: figures 45 and 46.
 */
private fun computeIndicationBrakingCurveFromRef(
    context: EnvelopeSimContext,
    refBrakingCurve: EnvelopePart,
    refBrakingCurveType: BrakingCurveType,
    guiCurve: EnvelopePart,
    beginPos: Double
): EnvelopePart {
    assert(refBrakingCurve.endPos > beginPos)
    val rollingStock = context.rollingStock
    val tBs =
        when (refBrakingCurveType) {
            BrakingCurveType.EBI -> rollingStock.rjsEtcsBrakeParams.tBs2
            BrakingCurveType.SBD -> rollingStock.rjsEtcsBrakeParams.tBs1
            else ->
                throw IllegalArgumentException(
                    "Expected EBI or SBD reference braking curve type, found: $refBrakingCurveType"
                )
        }

    val reversedNewPos = ArrayList<Double>()
    val reversedNewSpeeds = ArrayList<Double>()
    for (i in refBrakingCurve.pointCount() - 1 downTo 0) {
        val reversedNewPosIndex = refBrakingCurve.pointCount() - 1 - i
        val speed = refBrakingCurve.getPointSpeed(i)
        val sbiPosition = getSbiPosition(refBrakingCurve.getPointPos(i), speed, tBs)
        val permittedSpeedPosition = getPermittedSpeedPosition(sbiPosition, speed)
        val adjustedPermittedSpeedPosition =
            getAdjustedPermittedSpeedPosition(
                permittedSpeedPosition,
                guiCurve.interpolatePosition(speed)
            )
        val indicationPosition = getIndicationPosition(adjustedPermittedSpeedPosition, speed, tBs)
        if (indicationPosition >= beginPos) {
            reversedNewPos.add(indicationPosition)
            reversedNewSpeeds.add(speed)
        } else {
            assert(reversedNewPosIndex > 0 && reversedNewPos[reversedNewPosIndex - 1] > beginPos)
            // Interpolate to begin position if reaching a position before it
            val prevPos = reversedNewPos[reversedNewPosIndex - 1]
            val prevSpeed = reversedNewSpeeds[reversedNewPosIndex - 1]
            val speedAtBeginPos =
                prevSpeed +
                    (beginPos - prevPos) * (speed - prevSpeed) / (indicationPosition - prevPos)
            reversedNewPos.add(beginPos)
            reversedNewSpeeds.add(speedAtBeginPos)
            break
        }
    }

    val nbPoints = reversedNewPos.size
    val newPosArray = DoubleArray(nbPoints)
    val newSpeedsArray = DoubleArray(nbPoints)
    for (i in newPosArray.indices) {
        newPosArray[i] = reversedNewPos[nbPoints - 1 - i]
        newSpeedsArray[i] = reversedNewSpeeds[nbPoints - 1 - i]
    }
    val brakingCurve =
        EnvelopePart.generateTimes(listOf(EnvelopeProfile.BRAKING), newPosArray, newSpeedsArray)

    return brakingCurve
}

/**
 * Keep the part of the full braking curve which is located underneath the overlay and intersects
 * with it or with begin position.
 */
private fun keepBrakingCurveUnderOverlay(
    fullBrakingCurve: EnvelopePart,
    overlay: Envelope,
    beginPos: Double
): EnvelopePart {
    assert(fullBrakingCurve.maxSpeed >= overlay.minSpeed)
    assert(fullBrakingCurve.endPos > beginPos)
    val positions = fullBrakingCurve.clonePositions()
    val speeds = fullBrakingCurve.cloneSpeeds()
    val timeDeltas = fullBrakingCurve.cloneTimes()
    val nbPoints = fullBrakingCurve.pointCount()
    val partBuilder = EnvelopePartBuilder()
    partBuilder.setAttr(EnvelopeProfile.BRAKING)
    val overlayBuilder =
        ConstrainedEnvelopePartBuilder(
            partBuilder,
            PositionConstraint(beginPos, overlay.endPos),
            SpeedConstraint(0.0, EnvelopePartConstraintType.FLOOR),
            EnvelopeConstraint(overlay, EnvelopePartConstraintType.CEILING)
        )
    overlayBuilder.initEnvelopePart(positions[nbPoints - 1], speeds[nbPoints - 1], -1.0)
    for (i in fullBrakingCurve.pointCount() - 2 downTo 0) {
        if (!overlayBuilder.addStep(positions[i], speeds[i], timeDeltas[i])) break
    }
    return partBuilder.build()
}

/** Compute the position and speed offsets between EBD and EBI curves, for a given speed. */
private fun computeBecDeltaPosAndSpeed(
    context: EnvelopeSimContext,
    ebd: EnvelopePart,
    speed: Double,
    targetSpeed: Double
): Pair<Double, Double> {
    val position = ebd.interpolatePosition(speed)
    val rollingStock = context.rollingStock

    val vDelta0 = vDelta0(speed)

    val minGrade = TrainPhysicsIntegrator.getMinGrade(rollingStock, context.path, position)
    val weightForce = TrainPhysicsIntegrator.getWeightForce(rollingStock, minGrade)
    // The time during which the traction effort is still present
    val tTraction =
        max(
            rollingStock.rjsEtcsBrakeParams.tTractionCutOff -
                (tWarning + rollingStock.rjsEtcsBrakeParams.tBs2),
            0.0
        )
    // Estimated acceleration during tTraction, worst case scenario (the train accelerates as much
    // as possible)
    val aEst1 =
        TrainPhysicsIntegrator.computeAcceleration(
            rollingStock,
            rollingStock.getRollingResistance(speed),
            weightForce,
            speed,
            PhysicsRollingStock.getMaxEffort(speed, context.tractiveEffortCurveMap.get(position)),
            1.0
        )
    // Speed correction due to the traction staying active during tTraction
    val vDelta1 = aEst1 * tTraction

    // The remaining time during which the traction effort is not present
    val tBerem = max(rollingStock.rjsEtcsBrakeParams.tBe - tTraction, 0.0)
    // Speed correction due to the braking system not being active yet
    val vDelta2 = aEst2 * tBerem

    val maxV = max(speed + vDelta0 + vDelta1, targetSpeed)
    val dBec =
        max(speed + vDelta0 + vDelta1 / 2, targetSpeed) * tTraction + (maxV + vDelta1 / 2) * tBerem
    val vBec = maxV + vDelta2
    val deltaSpeed = vBec - speed

    return Pair(dBec, deltaSpeed)
}

private fun maxBecDeltaSpeed(): Double {
    // TODO: correctly compute maxBecDeltaSpeed
    return 50.0 / 3.6
}

/** See Subset referenced in ETCSBrakingSimulator: §3.13.9.3.3.1 and §3.13.9.3.3.2. */
private fun getSbiPosition(ebiOrSbdPosition: Double, speed: Double, tbs: Double): Double {
    return getPreviousPosition(ebiOrSbdPosition, speed, tbs)
}

/** See Subset referenced in ETCSBrakingSimulator: §3.13.9.3.5.1. */
private fun getPermittedSpeedPosition(sbiPosition: Double, speed: Double): Double {
    return getPreviousPosition(sbiPosition, speed, tDriver)
}

/** See Subset referenced in ETCSBrakingSimulator: §3.13.9.3.5.4. */
private fun getAdjustedPermittedSpeedPosition(
    permittedSpeedPosition: Double,
    guiPosition: Double = Double.POSITIVE_INFINITY
): Double {
    return min(permittedSpeedPosition, guiPosition)
}

/** See Subset referenced in ETCSBrakingSimulator: §3.13.9.3.6.1 and §3.13.9.3.6.2. */
private fun getIndicationPosition(
    permittedSpeedPosition: Double,
    speed: Double,
    tBs: Double
): Double {
    val tIndication = max((0.8 * tBs), 5.0) + tDriver
    return getPreviousPosition(permittedSpeedPosition, speed, tIndication)
}

private fun getPreviousPosition(position: Double, speed: Double, elapsedTime: Double): Double {
    return getPreviousPosition(position, speed * elapsedTime)
}

private fun getPreviousPosition(position: Double, elapsedDistance: Double): Double {
    return position - elapsedDistance
}
