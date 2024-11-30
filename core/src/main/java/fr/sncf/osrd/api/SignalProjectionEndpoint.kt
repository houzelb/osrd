package fr.sncf.osrd.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings
import fr.sncf.osrd.api.api_v2.SignalCriticalPosition
import fr.sncf.osrd.api.api_v2.ZoneUpdate
import fr.sncf.osrd.api.pathfinding.makeChunkPath
import fr.sncf.osrd.railjson.schema.common.ID
import fr.sncf.osrd.railjson.schema.rollingstock.RJSRollingResistance
import fr.sncf.osrd.railjson.schema.schedule.RJSAllowance
import fr.sncf.osrd.railjson.schema.schedule.RJSAllowanceValue
import fr.sncf.osrd.railjson.schema.schedule.RJSTrainPath
import fr.sncf.osrd.reporting.warnings.DiagnosticRecorderImpl
import fr.sncf.osrd.reporting.warnings.Warning
import fr.sncf.osrd.signal_projection.projectSignals
import fr.sncf.osrd.sim_infra.api.Block
import fr.sncf.osrd.sim_infra.api.convertRoutePath
import fr.sncf.osrd.sim_infra.api.findSignalingSystemOrThrow
import fr.sncf.osrd.standalone_sim.recoverBlockPath
import fr.sncf.osrd.standalone_sim.result.ResultTrain
import fr.sncf.osrd.standalone_sim.result.ResultTrain.SignalSighting
import fr.sncf.osrd.standalone_sim.result.SignalUpdate
import fr.sncf.osrd.utils.indexing.mutableStaticIdxArrayListOf
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.meters
import fr.sncf.osrd.utils.units.seconds
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

            val sigSystemManager = infra.signalingSimulator.sigModuleManager
            val bal = sigSystemManager.findSignalingSystemOrThrow("BAL")
            val bapr = sigSystemManager.findSignalingSystemOrThrow("BAPR")
            val tvm300 = sigSystemManager.findSignalingSystemOrThrow("TVM300")
            val tvm430 = sigSystemManager.findSignalingSystemOrThrow("TVM430")

            // Recover blocks from the route path
            val detailedBlockPath = recoverBlockPath(infra.signalingSimulator, infra, routePath)
            val blockPath = mutableStaticIdxArrayListOf<Block>()
            for (block in detailedBlockPath) blockPath.add(block.block)

            val signalCriticalPosition =
                request.signalSightings!!.map {
                    SignalCriticalPosition(
                        it.signal,
                        it.time.seconds,
                        Offset(it.offset.meters),
                        it.state
                    )
                }

            val zoneUpdates =
                request.zoneUpdates!!.map {
                    ZoneUpdate(it.zone, it.time.seconds, Offset(it.offset.meters), it.isEntry)
                }

            val simulationEndTime = request.zoneUpdates!!.maxOf { it.time.seconds } + 3600.seconds

            val updates =
                projectSignals(
                    infra,
                    chunkPath,
                    blockPath,
                    routePath,
                    signalCriticalPosition,
                    zoneUpdates,
                    simulationEndTime
                )

            val result =
                SignalProjectionResult(
                    updates.map {
                        val physicalSignalId = infra.rawInfra.findPhysicalSignal(it.signalID)!!
                        val physicalSignalTrack =
                            infra.rawInfra.getPhysicalSignalTrack(physicalSignalId)
                        val physicalSignalTrackOffset =
                            infra.rawInfra.getPhysicalSignalTrackOffset(physicalSignalId)
                        val track = infra.rawInfra.getTrackSectionName(physicalSignalTrack)
                        SignalUpdate(
                            it.signalID,
                            it.timeStart.seconds,
                            it.timeEnd.seconds,
                            it.positionStart.distance.meters,
                            it.positionEnd.distance.meters,
                            it.color,
                            it.blinking,
                            it.aspectLabel,
                            track,
                            physicalSignalTrackOffset.distance.meters
                        )
                    }
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
