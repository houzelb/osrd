import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import bbox from '@turf/bbox';
import type { Feature, Point } from 'geojson';
import { compact } from 'lodash';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import ReactMapGL, { AttributionControl, ScaleControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useParams } from 'react-router-dom';

import captureMap from 'applications/operationalStudies/helpers/captureMap';
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import type { PathProperties } from 'common/api/osrdEditoastApi';
import MapButtons from 'common/Map/Buttons/MapButtons';
import { CUSTOM_ATTRIBUTION } from 'common/Map/const';
import colors from 'common/Map/Consts/colors';
import Background from 'common/Map/Layers/Background';
import { useMapBlankStyle } from 'common/Map/Layers/blankStyle';
import BufferStops from 'common/Map/Layers/BufferStops';
import Detectors from 'common/Map/Layers/Detectors';
import Electrifications from 'common/Map/Layers/Electrifications';
import NeutralSections from 'common/Map/Layers/extensions/SNCF/NeutralSections';
import SNCF_PSL from 'common/Map/Layers/extensions/SNCF/PSL';
import Hillshade from 'common/Map/Layers/Hillshade';
import IGN_BD_ORTHO from 'common/Map/Layers/IGN_BD_ORTHO';
import IGN_CADASTRE from 'common/Map/Layers/IGN_CADASTRE';
import IGN_SCAN25 from 'common/Map/Layers/IGN_SCAN25';
import LineSearchLayer from 'common/Map/Layers/LineSearchLayer';
import OperationalPoints from 'common/Map/Layers/OperationalPoints';
import OSM from 'common/Map/Layers/OSM';
import PlatformsLayer from 'common/Map/Layers/Platforms';
import Routes from 'common/Map/Layers/Routes';
import SearchMarker from 'common/Map/Layers/SearchMarker';
import Signals from 'common/Map/Layers/Signals';
import SnappedMarker from 'common/Map/Layers/SnappedMarker';
import SpeedLimits from 'common/Map/Layers/SpeedLimits';
import Switches from 'common/Map/Layers/Switches';
import Terrain from 'common/Map/Layers/Terrain';
import TracksGeographic from 'common/Map/Layers/TracksGeographic';
import TracksOSM from 'common/Map/Layers/TracksOSM';
import { computeBBoxViewport } from 'common/Map/WarpedMap/core/helpers';
import { useInfraID } from 'common/osrdContext';
import { LAYER_GROUPS_ORDER, LAYERS } from 'config/layerOrder';
import VirtualLayers from 'modules/simulationResult/components/SimulationResultsMap/VirtualLayers';
import AddPathStepPopup from 'modules/trainschedule/components/ManageTrainSchedule/ManageTrainScheduleMap/AddPathStepPopup';
import { mapInitialState } from 'reducers/map';
import type { Viewport } from 'reducers/map';
import { getMapMouseEventNearestFeature } from 'utils/mapHelper';

import ItineraryLayer from './ManageTrainScheduleMap/ItineraryLayer';
import ItineraryMarkers, {
  type MarkerInformation,
} from './ManageTrainScheduleMap/ItineraryMarkers';
import type { FeatureInfoClick } from './types';

type MapProps = {
  initialViewport?: Partial<Viewport>;
  withSearchButton?: boolean;
  withToggleLayersButton?: boolean;
  withMapKeyButton?: boolean;
  pathProperties?: ManageTrainSchedulePathProperties;
  pathGeometry?: NonNullable<PathProperties['geometry']>;
  setMapCanvas?: (mapCanvas: string) => void;
  isReadOnly?: boolean;
  hideAttribution?: boolean;
  hideItinerary?: boolean;
  preventPointSelection?: boolean;
  id: string;
  simulationPathSteps: MarkerInformation[];
  showStdcmAssets?: boolean;
  isFeasible?: boolean;
};

const ZOOM_DEFAULT = 5;
const ZOOM_DELTA = 1.5;

const NewMap = ({
  initialViewport = {},
  withSearchButton = false,
  withToggleLayersButton = false,
  withMapKeyButton = false,
  pathProperties,
  pathGeometry: geometry,
  setMapCanvas,
  isReadOnly = false,
  hideAttribution = false,
  hideItinerary = false,
  preventPointSelection = false,
  id,
  simulationPathSteps,
  showStdcmAssets = false,
  isFeasible = true,
  children,
}: PropsWithChildren<MapProps>) => {
  const mapBlankStyle = useMapBlankStyle();

  const infraID = useInfraID();
  const [mapState, setMapState] = useState({
    ...mapInitialState,
    viewport: {
      ...mapInitialState.viewport,
      ...initialViewport,
    },
  });

  const { viewport, mapSearchMarker, mapStyle, showOSM, layersSettings, terrain3DExaggeration } =
    mapState;

  const pathGeometry = useMemo(
    () => geometry || pathProperties?.geometry,
    [pathProperties, geometry]
  );

  const mapViewport = useMemo(
    () =>
      isReadOnly && pathGeometry ? computeBBoxViewport(bbox(pathGeometry), viewport) : viewport,
    [isReadOnly, pathGeometry, viewport]
  );

  const [mapIsLoaded, setMapIsLoaded] = useState(false);

  const [snappedPoint, setSnappedPoint] = useState<Feature<Point> | undefined>();
  const { urlLat = '', urlLon = '', urlZoom = '', urlBearing = '', urlPitch = '' } = useParams();

  const updateViewportChange = useCallback(
    (value: Partial<Viewport>) =>
      setMapState((prev) => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          ...value,
        },
      })),
    []
  );

  const mapRef = useRef<MapRef | null>(null);

  const scaleControlStyle = {
    left: 20,
    bottom: 20,
  };

  const [featureInfoClick, setFeatureInfoClick] = useState<FeatureInfoClick>();

  const resetFeatureInfoClick = useCallback(() => {
    setFeatureInfoClick(undefined);
  }, []);

  const closeFeatureInfoClickPopup = useCallback(() => {
    if (featureInfoClick) {
      setFeatureInfoClick(undefined);
    }
  }, [featureInfoClick]);

  const resetPitchBearing = () => {
    updateViewportChange({
      ...mapViewport,
      bearing: 0,
      pitch: 0,
    });
  };

  const zoomIn = () => {
    updateViewportChange({
      ...mapViewport,
      zoom: (mapViewport.zoom || ZOOM_DEFAULT) + ZOOM_DELTA,
    });
  };
  const zoomOut = () => {
    updateViewportChange({
      ...mapViewport,
      zoom: (mapViewport.zoom || ZOOM_DEFAULT) - ZOOM_DELTA,
    });
  };
  const removeSearchItemMarkersOnMap = () => {
    setMapState((prev) => ({
      ...prev,
      mapSearchMarker: undefined,
      lineSearchCode: undefined,
    }));
  };

  const onFeatureClick = (e: MapLayerMouseEvent) => {
    if (preventPointSelection) return;
    const result = getMapMouseEventNearestFeature(e, { layersId: ['chartis/tracks-geo/main'] });
    if (result?.feature.properties?.id && result?.feature.geometry.type === 'LineString') {
      setFeatureInfoClick({
        feature: result.feature,
        coordinates: result.nearest,
      });
    } else {
      setFeatureInfoClick(undefined);
    }
    removeSearchItemMarkersOnMap();
  };

  const onMoveGetFeature = (e: MapLayerMouseEvent) => {
    if (preventPointSelection) return;
    const result = getMapMouseEventNearestFeature(e, { layersId: ['chartis/tracks-geo/main'] });
    if (result?.feature.properties?.id && result?.feature.geometry.type === 'LineString') {
      setSnappedPoint({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: result.nearest,
        },
        properties: {
          distance: result.distance,
        },
      });
    } else {
      setSnappedPoint(undefined);
    }
  };

  const interactiveLayerIds = useMemo(() => {
    const result: Array<string> = [];
    result.push('chartis/tracks-geo/main');
    if (layersSettings.operationalpoints) {
      result.push('chartis/osrd_operational_point/geo');
    }
    if (layersSettings.tvds) {
      result.push('chartis/osrd_tvd_section/geo');
    }
    return result;
  }, [layersSettings]);

  useEffect(() => {
    if (urlLat) {
      updateViewportChange({
        ...mapViewport,
        latitude: parseFloat(urlLat),
        longitude: parseFloat(urlLon),
        zoom: parseFloat(urlZoom),
        bearing: parseFloat(urlBearing),
        pitch: parseFloat(urlPitch),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const points = pathGeometry ?? {
      coordinates: compact(simulationPathSteps.map((step) => step.coordinates)),
      type: 'LineString',
    };
    if (points.coordinates.length > 2) {
      const newViewport = computeBBoxViewport(bbox(points), mapViewport);
      updateViewportChange(newViewport);
    }
  }, [pathGeometry, simulationPathSteps]);

  return (
    <>
      {!isReadOnly && (
        <MapButtons
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          map={mapRef.current ?? undefined}
          resetPitchBearing={resetPitchBearing}
          closeFeatureInfoClickPopup={closeFeatureInfoClickPopup}
          bearing={mapViewport.bearing}
          withMapKeyButton={withMapKeyButton}
          withSearchButton={withSearchButton}
          withToggleLayersButton={withToggleLayersButton}
          viewPort={mapViewport}
          isNewButtons
        />
      )}
      <ReactMapGL
        dragPan={false}
        scrollZoom={false}
        ref={mapRef}
        {...mapViewport}
        style={{ width: '100%', height: '100%' }}
        cursor={isReadOnly || preventPointSelection ? 'default' : 'pointer'}
        mapStyle={mapBlankStyle}
        attributionControl={false} // Defined below
        {...(!isReadOnly && {
          dragPan: true,
          scrollZoom: true,
          onMove: (e) => updateViewportChange(e.viewState),
          onMouseMove: onMoveGetFeature,
          onClick: onFeatureClick,
          onResize: (e) => {
            updateViewportChange({
              width: e.target.getContainer().offsetWidth,
              height: e.target.getContainer().offsetHeight,
            });
          },
        })}
        interactiveLayerIds={interactiveLayerIds}
        touchZoomRotate
        maxPitch={85}
        terrain={
          terrain3DExaggeration
            ? { source: 'terrain', exaggeration: terrain3DExaggeration }
            : undefined
        }
        onLoad={() => {
          setMapIsLoaded(true);
        }}
        onIdle={() => {
          captureMap(mapViewport, id, setMapCanvas, pathGeometry);
        }}
        preserveDrawingBuffer
        id={id}
      >
        <VirtualLayers />
        {!hideAttribution && (
          <AttributionControl position="bottom-right" customAttribution={CUSTOM_ATTRIBUTION} />
        )}
        <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />

        <Background
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
        />
        <Terrain />

        <IGN_BD_ORTHO layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />
        <IGN_SCAN25 layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />
        <IGN_CADASTRE layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />

        {mapIsLoaded && showOSM && (
          <>
            <OSM
              mapStyle={mapStyle}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
              mapIsLoaded={mapIsLoaded}
            />
            <Hillshade
              mapStyle={mapStyle}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
            />
          </>
        )}

        <PlatformsLayer
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.PLATFORMS.GROUP]}
        />

        <TracksGeographic
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.TRACKS_GEOGRAPHIC.GROUP]}
          infraID={infraID}
        />
        <TracksOSM
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.TRACKS_OSM.GROUP]}
        />

        <Routes
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.ROUTES.GROUP]}
          infraID={infraID}
        />
        {!isReadOnly && (
          <>
            <OperationalPoints
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.OPERATIONAL_POINTS.GROUP]}
              infraID={infraID}
            />

            <Electrifications
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.ELECTRIFICATIONS.GROUP]}
              infraID={infraID}
            />

            <NeutralSections
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.DEAD_SECTIONS.GROUP]}
              infraID={infraID}
            />

            <BufferStops
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.BUFFER_STOPS.GROUP]}
              infraID={infraID}
            />
            <Detectors
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.DETECTORS.GROUP]}
              infraID={infraID}
            />
            <Switches
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.SWITCHES.GROUP]}
              infraID={infraID}
            />

            <SpeedLimits
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.SPEED_LIMITS.GROUP]}
              infraID={infraID}
            />
            <SNCF_PSL
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.SPEED_LIMITS.GROUP]}
              infraID={infraID}
            />

            <Signals
              sourceTable="signals"
              colors={colors[mapStyle]}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.SIGNALS.GROUP]}
              infraID={infraID}
            />
            <LineSearchLayer
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.LINE_SEARCH.GROUP]}
              infraID={infraID}
            />
            {!showStdcmAssets && featureInfoClick && (
              <AddPathStepPopup
                pathProperties={pathProperties}
                featureInfoClick={featureInfoClick}
                resetFeatureInfoClick={resetFeatureInfoClick}
              />
            )}
          </>
        )}
        <ItineraryLayer
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.ITINERARY.GROUP]}
          geometry={pathGeometry}
          hideItineraryLine={hideItinerary}
          showStdcmAssets={showStdcmAssets}
          isFeasible={isFeasible}
        />
        {mapRef.current && (
          <ItineraryMarkers
            simulationPathSteps={simulationPathSteps}
            map={mapRef.current.getMap()}
            showStdcmAssets={showStdcmAssets}
          />
        )}
        {mapSearchMarker && <SearchMarker data={mapSearchMarker} colors={colors[mapStyle]} />}
        {snappedPoint !== undefined && <SnappedMarker geojson={snappedPoint} />}

        {children}
      </ReactMapGL>
    </>
  );
};

export default NewMap;
