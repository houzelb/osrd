package fr.sncf.osrd.utils

import com.google.common.collect.HashBiMap
import com.google.common.collect.HashMultimap
import fr.sncf.osrd.api.FullInfra
import fr.sncf.osrd.geom.LineString
import fr.sncf.osrd.sim_infra.api.*
import fr.sncf.osrd.sim_infra.impl.NeutralSection
import fr.sncf.osrd.utils.indexing.*
import fr.sncf.osrd.utils.units.Distance
import fr.sncf.osrd.utils.units.DistanceList
import fr.sncf.osrd.utils.units.Speed
import fr.sncf.osrd.utils.units.meters
import kotlin.time.Duration

/** This class is used to create a minimal infra to be used on STDCM tests, with a simple block graph.  */
@Suppress("INAPPLICABLE_JVM_NAME")
class DummyInfra : RawInfra, BlockInfra {

    /** get the FullInfra  */
    fun fullInfra(): FullInfra {
        return FullInfra(
            null,
            this,
            null,
            this,
            null
        )
    }

    /** Creates a block going from nodes `entry` to `exit` of length `length`, named $entry->$exit,
     * with the given maximum speed. Value class are used as their underlying type to use @JvmOverloads  */
    fun addBlock(
        entry: String,
        exit: String,
    ): BlockId {
        return addBlock(entry, exit, 100.meters)
    }

    /** Creates a block going from nodes `entry` to `exit` of length `length`, named $entry->$exit,
     * with the given maximum speed. Value class are used as their underlying type to use @JvmOverloads  */
    fun addBlock(
        entry: String,
        exit: String,
        length: Distance
    ): BlockId {
        return addBlock(entry, exit, length, Double.POSITIVE_INFINITY)
    }

    /** Creates a block going from nodes `entry` to `exit` of length `length`, named $entry->$exit,
     * with the given maximum speed. */
    fun addBlock(
        entry: String,
        exit: String,
        length: Distance,
        allowedSpeed: Double,
    ): BlockId {
        val name = String.format("%s->%s", entry, exit)
        val entryId = detectorMap.computeIfAbsent(entry) { DirDetectorId(detectorMap.size.toUInt()) }
        val exitId = detectorMap.computeIfAbsent(exit) { DirDetectorId(detectorMap.size.toUInt()) }
        val id = blockPool.add(
            DummyBlockDescriptor(
                length,
                name,
                entryId,
                exitId,
                allowedSpeed,
            )
        )
        entryMap.put(entryId, id)
        exitMap.put(exitId, id)
        return id
    }

    class DummyBlockDescriptor(
        val length: Distance,
        val name: String,
        val entry: DirDetectorId,
        val exit: DirDetectorId,
        val allowedSpeed: Double,
    )
    private val blockPool = StaticPool<Block, DummyBlockDescriptor>()
    private val detectorMap = HashBiMap.create<String, DirDetectorId>()
    private val entryMap = HashMultimap.create<DirDetectorId, BlockId>()
    private val exitMap = HashMultimap.create<DirDetectorId, BlockId>()

    // region not implemented

    override fun getSignals(zonePath: ZonePathId): StaticIdxList<PhysicalSignal> {
        TODO("Not yet implemented")
    }

    override fun getSignalPositions(zonePath: ZonePathId): DistanceList {
        TODO("Not yet implemented")
    }

    override fun getSpeedLimits(route: RouteId): StaticIdxList<SpeedLimit> {
        TODO("Not yet implemented")
    }

    override fun getSpeedLimitStarts(route: RouteId): DistanceList {
        TODO("Not yet implemented")
    }

    override fun getSpeedLimitEnds(route: RouteId): DistanceList {
        TODO("Not yet implemented")
    }

    override val physicalSignals: StaticIdxSpace<PhysicalSignal>
        get() = TODO("Not yet implemented")
    override val logicalSignals: StaticIdxSpace<LogicalSignal>
        get() = TODO("Not yet implemented")

    override fun getLogicalSignals(signal: PhysicalSignalId): StaticIdxList<LogicalSignal> {
        TODO("Not yet implemented")
    }

    override fun getPhysicalSignal(signal: LogicalSignalId): PhysicalSignalId {
        TODO("Not yet implemented")
    }

    override fun getPhysicalSignalName(signal: PhysicalSignalId): String? {
        TODO("Not yet implemented")
    }

    override fun getSignalSightDistance(signal: PhysicalSignalId): Distance {
        TODO("Not yet implemented")
    }

    override fun getSignalingSystemId(signal: LogicalSignalId): String {
        TODO("Not yet implemented")
    }

    override fun getRawSettings(signal: LogicalSignalId): Map<String, String> {
        TODO("Not yet implemented")
    }

    override fun getNextSignalingSystemIds(signal: LogicalSignalId): List<String> {
        TODO("Not yet implemented")
    }

    override val routes: StaticIdxSpace<Route>
        get() = TODO("Not yet implemented")

    override fun getRoutePath(route: RouteId): StaticIdxList<ZonePath> {
        TODO("Not yet implemented")
    }

    override fun getRouteName(route: RouteId): String? {
        TODO("Not yet implemented")
    }

    override fun getRouteFromName(name: String): RouteId {
        TODO("Not yet implemented")
    }

    override fun getRouteReleaseZones(route: RouteId): IntArray {
        TODO("Not yet implemented")
    }

    override fun getChunksOnRoute(route: RouteId): DirStaticIdxList<TrackChunk> {
        TODO("Not yet implemented")
    }

    override fun getRoutesOnTrackChunk(trackChunk: DirTrackChunkId): StaticIdxList<Route> {
        TODO("Not yet implemented")
    }

    override fun getRoutesStartingAtDet(dirDetector: DirDetectorId): StaticIdxList<Route> {
        TODO("Not yet implemented")
    }

    override fun getRoutesEndingAtDet(dirDetector: DirDetectorId): StaticIdxList<Route> {
        TODO("Not yet implemented")
    }

    override val zonePaths: StaticIdxSpace<ZonePath>
        get() = TODO("Not yet implemented")

    override fun findZonePath(
        entry: DirDetectorId,
        exit: DirDetectorId,
        movableElements: StaticIdxList<TrackNode>,
        trackNodeConfigs: StaticIdxList<TrackNodeConfig>
    ): ZonePathId? {
        TODO("Not yet implemented")
    }

    override fun getZonePathEntry(zonePath: ZonePathId): DirDetectorId {
        TODO("Not yet implemented")
    }

    override fun getZonePathExit(zonePath: ZonePathId): DirDetectorId {
        TODO("Not yet implemented")
    }

    override fun getZonePathLength(zonePath: ZonePathId): Distance {
        TODO("Not yet implemented")
    }

    override fun getZonePathMovableElements(zonePath: ZonePathId): StaticIdxList<TrackNode> {
        TODO("Not yet implemented")
    }

    override fun getZonePathMovableElementsConfigs(zonePath: ZonePathId): StaticIdxList<TrackNodeConfig> {
        TODO("Not yet implemented")
    }

    override fun getZonePathMovableElementsDistances(zonePath: ZonePathId): DistanceList {
        TODO("Not yet implemented")
    }

    override fun getZonePathChunks(zonePath: ZonePathId): DirStaticIdxList<TrackChunk> {
        TODO("Not yet implemented")
    }

    override val zones: StaticIdxSpace<Zone>
        get() = TODO("Not yet implemented")

    override fun getMovableElements(zone: ZoneId): StaticIdxSortedSet<TrackNode> {
        TODO("Not yet implemented")
    }

    override fun getZoneBounds(zone: ZoneId): List<DirDetectorId> {
        TODO("Not yet implemented")
    }

    override val detectors: StaticIdxSpace<Detector>
        get() = TODO("Not yet implemented")

    override fun getNextZone(dirDet: DirDetectorId): ZoneId? {
        TODO("Not yet implemented")
    }

    override fun getPreviousZone(dirDet: DirDetectorId): ZoneId? {
        TODO("Not yet implemented")
    }

    override fun getDetectorName(det: DetectorId): String? {
        TODO("Not yet implemented")
    }

    override fun getNextTrackSection(currentTrack: DirTrackSectionId, config: TrackNodeConfigId): OptDirTrackSectionId {
        TODO("Not yet implemented")
    }

    override fun getNextTrackNode(trackSection: DirTrackSectionId): OptStaticIdx<TrackNode> {
        TODO("Not yet implemented")
    }

    override fun getNextTrackNodePort(trackSection: DirTrackSectionId): OptStaticIdx<TrackNodePort> {
        TODO("Not yet implemented")
    }

    override fun getPortConnection(trackNode: TrackNodeId, port: TrackNodePortId): EndpointTrackSectionId {
        TODO("Not yet implemented")
    }

    override fun getTrackNodeConfigs(trackNode: TrackNodeId): StaticIdxSpace<TrackNodeConfig> {
        TODO("Not yet implemented")
    }

    override fun getTrackNodePorts(trackNode: TrackNodeId): StaticIdxSpace<TrackNodePort> {
        TODO("Not yet implemented")
    }

    override fun getTrackNodeExitPort(
        trackNode: TrackNodeId,
        config: TrackNodeConfigId,
        entryPort: TrackNodePortId
    ): OptStaticIdx<TrackNodePort> {
        TODO("Not yet implemented")
    }

    override fun getTrackNodeDelay(trackNode: TrackNodeId): Duration {
        TODO("Not yet implemented")
    }

    override fun getTrackNodeConfigName(trackNode: TrackNodeId, config: TrackNodeConfigId): String {
        TODO("Not yet implemented")
    }

    override fun getTrackNodeName(trackNode: TrackNodeId): String {
        TODO("Not yet implemented")
    }

    override val trackNodes: StaticIdxSpace<TrackNode>
        get() = TODO("Not yet implemented")
    override val trackSections: StaticIdxSpace<TrackSection>
        get() = TODO("Not yet implemented")

    override fun getTrackSectionName(trackSection: TrackSectionId): String {
        TODO("Not yet implemented")
    }

    override fun getTrackSectionFromName(name: String): TrackSectionId? {
        TODO("Not yet implemented")
    }

    override fun getTrackSectionChunks(trackSection: TrackSectionId): StaticIdxList<TrackChunk> {
        TODO("Not yet implemented")
    }

    override fun getTrackSectionLength(trackSection: TrackSectionId): Distance {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkLength(trackChunk: TrackChunkId): Distance {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkOffset(trackChunk: TrackChunkId): Distance {
        TODO("Not yet implemented")
    }

    override fun getTrackFromChunk(trackChunk: TrackChunkId): TrackSectionId {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkSlope(trackChunk: DirTrackChunkId): DistanceRangeMap<Double> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkCurve(trackChunk: DirTrackChunkId): DistanceRangeMap<Double> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkGradient(trackChunk: DirTrackChunkId): DistanceRangeMap<Double> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkLoadingGaugeConstraints(trackChunk: TrackChunkId): DistanceRangeMap<LoadingGaugeConstraint> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkCatenaryVoltage(trackChunk: TrackChunkId): DistanceRangeMap<String> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkNeutralSections(trackChunk: DirTrackChunkId): DistanceRangeMap<NeutralSection> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkSpeedSections(trackChunk: DirTrackChunkId, trainTag: String?): DistanceRangeMap<Speed> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkGeom(trackChunk: TrackChunkId): LineString {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkElectricalProfile(
        trackChunk: TrackChunkId,
        mapping: HashMap<String, DistanceRangeMap<String>>
    ): DistanceRangeMap<String> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunkOperationalPointParts(trackChunk: TrackChunkId): StaticIdxList<OperationalPointPart> {
        TODO("Not yet implemented")
    }

    override fun getOperationalPointPartChunk(operationalPoint: OperationalPointPartId): TrackChunkId {
        TODO("Not yet implemented")
    }

    override fun getOperationalPointPartChunkOffset(operationalPoint: OperationalPointPartId): Distance {
        TODO("Not yet implemented")
    }

    override fun getOperationalPointPartName(operationalPoint: OperationalPointPartId): String {
        TODO("Not yet implemented")
    }

    override val blocks: StaticIdxSpace<Block>
        get() = TODO("Not yet implemented")

    override fun getBlockPath(block: BlockId): StaticIdxList<ZonePath> {
        TODO("Not yet implemented")
    }

    override fun getBlockSignals(block: BlockId): StaticIdxList<LogicalSignal> {
        TODO("Not yet implemented")
    }

    override fun blockStartAtBufferStop(block: BlockId): Boolean {
        TODO("Not yet implemented")
    }

    override fun blockStopAtBufferStop(block: BlockId): Boolean {
        TODO("Not yet implemented")
    }

    override fun getBlockSignalingSystem(block: BlockId): SignalingSystemId {
        TODO("Not yet implemented")
    }

    override fun getBlocksAtDetector(detector: DirDetectorId): StaticIdxList<Block> {
        TODO("Not yet implemented")
    }

    override fun getBlocksAtSignal(signal: LogicalSignalId): StaticIdxList<Block> {
        TODO("Not yet implemented")
    }

    override fun getSignalsPositions(block: BlockId): DistanceList {
        TODO("Not yet implemented")
    }

    override fun getBlocksFromTrackChunk(
        trackChunk: TrackChunkId,
        direction: Direction
    ): MutableStaticIdxArraySet<Block> {
        TODO("Not yet implemented")
    }

    override fun getTrackChunksFromBlock(block: BlockId): DirStaticIdxList<TrackChunk> {
        TODO("Not yet implemented")
    }

    override fun getBlockLength(block: BlockId): Distance {
        TODO("Not yet implemented")
    }
    // endregion

    companion object {
        /** Just for linking / symbol purpose with java interface */
        @JvmStatic
        fun make(): DummyInfra {
            return DummyInfra()
        }
    }
}
