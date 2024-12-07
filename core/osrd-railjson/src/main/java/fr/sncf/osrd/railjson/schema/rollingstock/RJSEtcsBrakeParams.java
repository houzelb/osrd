package fr.sncf.osrd.railjson.schema.rollingstock;

import com.squareup.moshi.Json;

/**
 * Braking parameters for ERTMS ETCS Level 2
 * Commented with their names in ETCS specification document `SUBSET-026-3 v400.pdf` from the
 * file at https://www.era.europa.eu/system/files/2023-09/index004_-_SUBSET-026_v400.zip
 */
public class RJSEtcsBrakeParams {

    // A_brake_emergency: the emergency deceleration curve (values > 0 m/s²)
    @Json(name = "gamma_emergency")
    public RJSSpeedIntervalValueCurve gammaEmergency;

    // A_brake_service: the full service deceleration curve (values > 0 m/s²)
    @Json(name = "gamma_service")
    public RJSSpeedIntervalValueCurve gammaService;

    // A_brake_normal_service: the normal service deceleration curve used to compute guidance curve (values > 0 m/s²)
    @Json(name = "gamma_normal_service")
    public RJSSpeedIntervalValueCurve gammaNormalService;

    // Kdry_rst: the rolling stock deceleration correction factors for dry rails
    // Boundaries should be the same as gammaEmergency
    // Values (no unit) should be contained in [0, 1]
    @Json(name = "k_dry")
    public RJSSpeedIntervalValueCurve kDry;

    // Kwet_rst: the rolling stock deceleration correction factors for wet rails
    // Boundaries should be the same as gammaEmergency
    // Values (no unit) should be contained in [0, 1]
    @Json(name = "k_wet")
    public RJSSpeedIntervalValueCurve kWet;

    // Kn+: the correction acceleration factor on normal service deceleration in positive gradients
    // Values (in m/s²) should be contained in [0, 10]
    @Json(name = "k_n_pos")
    public RJSSpeedIntervalValueCurve kNPos;

    // Kn-: the correction acceleration factor on normal service deceleration in negative gradients
    // Values (in m/s²) should be contained in [0, 10]
    @Json(name = "k_n_neg")
    public RJSSpeedIntervalValueCurve kNNeg;

    // T_traction_cut_off: time delay in s from the traction cut-off command to the moment the acceleration due to
    // traction is zero
    @Json(name = "t_traction_cut_off")
    public double tTractionCutOff;

    // T_bs1: time service break in s used for SBI1 computation
    @Json(name = "t_bs1")
    public double tBs1;

    // T_bs2: time service break in s used for SBI2 computation
    @Json(name = "t_bs2")
    public double tBs2;

    // T_be: safe brake build up time in s
    @Json(name = "t_be")
    public double tBe;

    public static final class RJSSpeedIntervalValueCurve {
        // Speed in m/s (sorted ascending). External bounds are implicit to [0, rolling_stock.max_speed]
        public double[] boundaries;

        // Interval values (unit to be made explicit at use)
        // There must be one more value than boundaries
        public double[] values;

        public double getValue(double speed) {
            assert (boundaries != null);
            assert (values != null);
            assert (values.length == boundaries.length + 1);
            int index = 0;
            var absSpeed = Math.abs(speed);
            for (var boundary : boundaries) {
                if (absSpeed <= boundary) {
                    return values[index];
                }
                index++;
            }
            return values[index];
        }
    }
}
