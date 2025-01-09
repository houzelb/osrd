package fr.sncf.osrd.signaling.etcs_level2

import fr.sncf.osrd.signaling.*
import fr.sncf.osrd.sim_infra.api.SigParameters
import fr.sncf.osrd.sim_infra.api.SigSettings
import fr.sncf.osrd.sim_infra.api.SigState
import fr.sncf.osrd.sim_infra.api.SigStateSchema

object ETCS_LEVEL2toBAPR : SignalDriver {
    override val name = "ETCS_LEVEL2-BAPR"
    override val inputSignalingSystem = "ETCS_LEVEL2"
    override val outputSignalingSystem = "BAPR"

    override fun evalSignal(
        signal: SigSettings,
        parameters: SigParameters,
        stateSchema: SigStateSchema,
        maView: MovementAuthorityView?,
        limitView: SpeedLimitView?
    ): SigState {
        return stateSchema { value("aspect", "VL") }
    }

    override fun checkSignal(reporter: SignalDiagReporter, signal: SigSettings, block: SigBlock) {}
}
