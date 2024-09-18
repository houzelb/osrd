package fr.sncf.osrd.stdcm.infra_exploration

import fr.sncf.osrd.conflicts.IncrementalRequirementEnvelopeAdapter
import fr.sncf.osrd.conflicts.SpacingRequirementAutomaton
import fr.sncf.osrd.conflicts.SpacingRequirements
import fr.sncf.osrd.envelope.Envelope
import fr.sncf.osrd.envelope.EnvelopeConcat
import fr.sncf.osrd.envelope.EnvelopeConcat.LocatedEnvelope
import fr.sncf.osrd.envelope.EnvelopeInterpolate
import fr.sncf.osrd.envelope_sim.PhysicsRollingStock
import fr.sncf.osrd.sim_infra.api.Path
import fr.sncf.osrd.standalone_sim.EnvelopeStopWrapper
import fr.sncf.osrd.standalone_sim.result.ResultTrain.SpacingRequirement
import fr.sncf.osrd.stdcm.graph.TimeData
import fr.sncf.osrd.stdcm.preprocessing.interfaces.BlockAvailabilityInterface
import fr.sncf.osrd.train.TrainStop
import fr.sncf.osrd.utils.AppendOnlyLinkedList
import fr.sncf.osrd.utils.appendOnlyLinkedListOf
import fr.sncf.osrd.utils.units.Distance
import fr.sncf.osrd.utils.units.Length
import fr.sncf.osrd.utils.units.Offset
import fr.sncf.osrd.utils.units.meters
import java.lang.ref.SoftReference

data class InfraExplorerWithEnvelopeImpl(
    private val infraExplorer: InfraExplorer,
    private val envelopes: AppendOnlyLinkedList<LocatedEnvelope>,
    private val spacingRequirementAutomaton: SpacingRequirementAutomaton,
    private val rollingStock: PhysicsRollingStock,
    private var stops: MutableList<TrainStop> = mutableListOf(),

    // Soft references tell the JVM that the values may be cleared when running out of memory
    private var spacingRequirementsCache: SoftReference<List<SpacingRequirement>>? = null,
    private var envelopeCache: SoftReference<EnvelopeInterpolate>? = null,
) : InfraExplorer by infraExplorer, InfraExplorerWithEnvelope {

    override fun cloneAndExtendLookahead(): Collection<InfraExplorerWithEnvelope> {
        return infraExplorer.cloneAndExtendLookahead().map { explorer ->
            InfraExplorerWithEnvelopeImpl(
                explorer,
                envelopes.shallowCopy(),
                spacingRequirementAutomaton.clone(),
                rollingStock,
                stops.toMutableList(),
                spacingRequirementsCache,
            )
        }
    }

    override fun getFullEnvelope(): EnvelopeInterpolate {
        val cached = envelopeCache?.get()
        if (cached != null) return cached
        val res = EnvelopeConcat.fromLocated(envelopes.toList())
        val withStops = EnvelopeStopWrapper(res, stops)
        envelopeCache = SoftReference(withStops)
        return withStops
    }

    override fun addEnvelope(envelope: Envelope): InfraExplorerWithEnvelope {
        var prevEndOffset = 0.0
        var prevEndTime = 0.0
        if (envelopes.isNotEmpty()) {
            val lastEnvelope = envelopes[envelopes.size - 1]
            prevEndTime = lastEnvelope.startTime + lastEnvelope.envelope.totalTime
            prevEndOffset = lastEnvelope.startOffset + lastEnvelope.envelope.endPos
        }
        envelopes.add(LocatedEnvelope(envelope, prevEndOffset, prevEndTime))
        envelopeCache = null
        spacingRequirementsCache = null
        return this
    }

    override fun withNewEnvelope(envelope: Envelope): InfraExplorerWithEnvelope {
        return copy(
            envelopes =
                appendOnlyLinkedListOf(
                    LocatedEnvelope(envelope, 0.0, 0.0),
                ),
            spacingRequirementAutomaton =
                SpacingRequirementAutomaton(
                    spacingRequirementAutomaton.rawInfra,
                    spacingRequirementAutomaton.loadedSignalInfra,
                    spacingRequirementAutomaton.blockInfra,
                    spacingRequirementAutomaton.simulator,
                    IncrementalRequirementEnvelopeAdapter(
                        rollingStock,
                        EnvelopeConcat.from(listOf(envelope)),
                        true
                    ),
                    getIncrementalPath(),
                ),
            spacingRequirementsCache = null,
            envelopeCache = null,
        )
    }

    override fun addStop(stopDuration: Double) {
        val position = getFullEnvelope().endPos
        // We tolerate duplicates and filter them
        if (stops.isEmpty() || stops.last().position != position) {
            stops.add(
                TrainStop(
                    position,
                    stopDuration,
                    true,
                )
            )
            envelopeCache = null
            spacingRequirementsCache = null
        } else {
            assert(stops.isEmpty() || stops.last().duration == stopDuration)
        }
    }

    override fun getStops(): List<TrainStop> {
        return stops
    }

    override fun updateStopDurations(updatedTimeData: TimeData): InfraExplorerWithEnvelope {
        for ((i, stop) in stops.withIndex()) {
            assert(i < updatedTimeData.stopTimeData.size)
            val updatedStop = updatedTimeData.stopTimeData[i]
            if (updatedStop.currentDuration != stop.duration) {
                stops[i] =
                    TrainStop(
                        stops[i].position,
                        updatedStop.currentDuration,
                        stops[i].onStopSignal,
                    )
            }
        }
        return this
    }

    override fun interpolateDepartureFromClamp(pathOffset: Offset<Path>): Double {
        return getFullEnvelope()
            .interpolateDepartureFromClamp(
                getIncrementalPath().toTravelledPath(pathOffset).distance.meters
            )
    }

    override fun getSpacingRequirements(): List<SpacingRequirement> {
        val cached = spacingRequirementsCache?.get()
        if (cached != null) return cached
        if (getFullEnvelope().endPos == 0.0) {
            // This case can happen when we start right at the end of a block
            return listOf()
        }
        spacingRequirementAutomaton.incrementalPath = getIncrementalPath()
        // Path is complete and has been completely simulated
        val simulationComplete = getIncrementalPath().pathComplete && getLookahead().size == 0
        spacingRequirementAutomaton.callbacks =
            IncrementalRequirementEnvelopeAdapter(
                rollingStock,
                getFullEnvelope(),
                simulationComplete
            )
        val updatedRequirements =
            spacingRequirementAutomaton.processPathUpdate() as? SpacingRequirements
                ?: throw BlockAvailabilityInterface.NotEnoughLookaheadError()
        spacingRequirementsCache = SoftReference(updatedRequirements.requirements)
        return updatedRequirements.requirements
    }

    override fun getFullSpacingRequirements(): List<SpacingRequirement> {
        val simulationComplete = getIncrementalPath().pathComplete && getLookahead().size == 0
        // We need a new automaton to get the resource uses over the whole path, and not just since
        // the last update
        val newAutomaton =
            SpacingRequirementAutomaton(
                spacingRequirementAutomaton.rawInfra,
                spacingRequirementAutomaton.loadedSignalInfra,
                spacingRequirementAutomaton.blockInfra,
                spacingRequirementAutomaton.simulator,
                IncrementalRequirementEnvelopeAdapter(
                    rollingStock,
                    getFullEnvelope(),
                    simulationComplete
                ),
                getIncrementalPath(),
            )
        val res =
            newAutomaton.processPathUpdate() as? SpacingRequirements
                ?: throw BlockAvailabilityInterface.NotEnoughLookaheadError()
        return res.requirements
    }

    override fun moveForward(): InfraExplorerWithEnvelope {
        infraExplorer.moveForward()
        spacingRequirementsCache = null
        return this
    }

    override fun getSimulatedLength(): Length<Path> {
        if (envelopes.isEmpty()) return Length(0.meters)
        val lastEnvelope = envelopes[envelopes.size - 1]
        return Length(Distance.fromMeters(lastEnvelope.startOffset + lastEnvelope.envelope.endPos))
    }

    override fun clone(): InfraExplorerWithEnvelope {
        return InfraExplorerWithEnvelopeImpl(
            infraExplorer.clone(),
            envelopes.shallowCopy(),
            spacingRequirementAutomaton.clone(),
            rollingStock,
            stops.toMutableList(),
            spacingRequirementsCache
        )
    }
}
