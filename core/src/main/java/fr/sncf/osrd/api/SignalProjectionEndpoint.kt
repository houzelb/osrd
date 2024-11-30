package fr.sncf.osrd.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings
import fr.sncf.osrd.api.SignalProjectionEndpoint.SignalProjectionResult
import fr.sncf.osrd.api.pathfinding.makeChunkPath
import fr.sncf.osrd.railjson.schema.common.ID
import fr.sncf.osrd.railjson.schema.rollingstock.RJSRollingResistance
import fr.sncf.osrd.railjson.schema.schedule.RJSAllowance
import fr.sncf.osrd.railjson.schema.schedule.RJSAllowanceValue
import fr.sncf.osrd.railjson.schema.schedule.RJSTrainPath
import fr.sncf.osrd.reporting.warnings.DiagnosticRecorderImpl
import fr.sncf.osrd.reporting.warnings.Warning
import fr.sncf.osrd.sim_infra.api.convertRoutePath
import fr.sncf.osrd.standalone_sim.project
import fr.sncf.osrd.standalone_sim.result.ResultTrain
import fr.sncf.osrd.standalone_sim.result.ResultTrain.SignalSighting
import fr.sncf.osrd.standalone_sim.result.SignalUpdate
import org.takes.Request
import org.takes.Response
import org.takes.Take
import org.takes.rq.RqPrint
import org.takes.rs.RsJson
import org.takes.rs.RsText
import org.takes.rs.RsWithBody
import org.takes.rs.RsWithStatus

class SignalProjectionEndpoint(private val infraManager: InfraManager) : Take {
    @Throws(Exception::class)
    override fun act(req: Request): Response {
        val recorder = DiagnosticRecorderImpl(false)
        try {
            // Parse request input
            val body = RqPrint(req).printBody()
            val request =
                adapterRequest.fromJson(body)
                    ?: return RsWithStatus(RsText("missing request body"), 400)

            // get infra
            val infra = infraManager.getInfra(request.infra, request.expectedVersion, recorder)

            // Parse trainPath
            val chunkPath = makeChunkPath(infra.rawInfra, request.trainPath!!)

            val routePath =
                infra.rawInfra.convertRoutePath(request.trainPath!!.routePath.map { it.route })

            val result =
                project(
                    infra,
                    chunkPath,
                    routePath,
                    request.signalSightings!!,
                    request.zoneUpdates!!
                )

            result.warnings = recorder.warnings

            return RsJson(RsWithBody(SignalProjectionResult.adapter.toJson(result)))
        } catch (ex: Throwable) {
            // TODO: include warnings in the response
            return ExceptionHandler.handle(ex)
        }
    }

    @SuppressFBWarnings("UWF_UNWRITTEN_PUBLIC_OR_PROTECTED_FIELD")
    class SignalProjectionRequest {
        /** Infra id */
        var infra: String? = null

        /** Infra version */
        @Json(name = "expected_version") var expectedVersion: String? = null

        /** The path used by trains */
        @Json(name = "train_path") var trainPath: RJSTrainPath? = null

        @Json(name = "signal_sightings") var signalSightings: List<SignalSighting>? = null

        @Json(name = "zone_updates") var zoneUpdates: List<ResultTrain.ZoneUpdate>? = null
    }

    @SuppressFBWarnings("URF_UNREAD_PUBLIC_OR_PROTECTED_FIELD")
    class SignalProjectionResult(
        @field:Json(name = "signal_updates") val signalUpdates: List<SignalUpdate>
    ) {
        var warnings: List<Warning> = ArrayList()

        companion object {
            val adapter: JsonAdapter<SignalProjectionResult> =
                Moshi.Builder().build().adapter(SignalProjectionResult::class.java)
        }
    }

    companion object {
        val adapterRequest: JsonAdapter<SignalProjectionRequest> =
            Moshi.Builder()
                .add(ID.Adapter.FACTORY)
                .add(RJSRollingResistance.adapter)
                .add(RJSAllowance.adapter)
                .add(RJSAllowanceValue.adapter)
                .build()
                .adapter(SignalProjectionRequest::class.java)
    }
}
