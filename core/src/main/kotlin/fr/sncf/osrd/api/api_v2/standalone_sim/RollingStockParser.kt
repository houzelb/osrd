package fr.sncf.osrd.api.api_v2.standalone_sim

import fr.sncf.osrd.railjson.parser.RJSRollingStockParser.parseModeEffortCurves
import fr.sncf.osrd.railjson.parser.RJSRollingStockParser.parseRollingResistance
import fr.sncf.osrd.railjson.schema.rollingstock.RJSLoadingGaugeType
import fr.sncf.osrd.reporting.exceptions.ErrorType
import fr.sncf.osrd.reporting.exceptions.OSRDError
import fr.sncf.osrd.train.RollingStock
import fr.sncf.osrd.train.RollingStock.ModeEffortCurves

/** Parse the rolling stock model into something the backend can work with */
fun parseRawRollingStock(
    rawPhysicsConsist: PhysicsConsistModel,
    loadingGaugeType: RJSLoadingGaugeType = RJSLoadingGaugeType.G1,
    rollingStockSupportedSignalingSystems: List<String> = listOf(),
): RollingStock {
    // Parse effort_curves
    val rawModes = rawPhysicsConsist.effortCurves.modes

    if (!rawModes.containsKey(rawPhysicsConsist.effortCurves.defaultMode))
        throw OSRDError.newInvalidRollingStockError(
            ErrorType.InvalidRollingStockDefaultModeNotFound,
            rawPhysicsConsist.effortCurves.defaultMode
        )

    // Parse tractive effort curves modes
    val modes = HashMap<String, ModeEffortCurves>()
    for ((key, value) in rawModes) {
        modes[key] = parseModeEffortCurves(value, "effort_curves.modes.$key")
    }

    val rollingResistance = parseRollingResistance(rawPhysicsConsist.rollingResistance)

    return RollingStock(
        "placeholder_name",
        rawPhysicsConsist.length.distance.meters,
        rawPhysicsConsist.mass.toDouble(),
        rawPhysicsConsist.inertiaCoefficient,
        rollingResistance.A,
        rollingResistance.B,
        rollingResistance.C,
        rawPhysicsConsist.maxSpeed,
        rawPhysicsConsist.startupTime.seconds,
        rawPhysicsConsist.startupAcceleration,
        rawPhysicsConsist.comfortAcceleration,
        rawPhysicsConsist.constGamma,
        rawPhysicsConsist.etcsBrakeParams,
        loadingGaugeType,
        modes,
        rawPhysicsConsist.effortCurves.defaultMode,
        rawPhysicsConsist.basePowerClass,
        rawPhysicsConsist.powerRestrictions,
        rawPhysicsConsist.electricalPowerStartupTime?.seconds,
        rawPhysicsConsist.raisePantographTime?.seconds,
        rollingStockSupportedSignalingSystems.toTypedArray(),
    )
}
