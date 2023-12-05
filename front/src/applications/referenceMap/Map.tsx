import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMapGL, { AttributionControl, ScaleControl } from 'react-map-gl/maplibre';
import { isNil } from 'lodash';
import { updateMapSearchMarker, updateViewport } from 'reducers/map';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import type { MapRef } from 'react-map-gl/maplibre';
import type { RootState } from 'reducers';
import type { Viewport } from 'reducers/map';

import { getTerrain3DExaggeration } from 'reducers/map/selectors';
import { LAYER_GROUPS_ORDER, LAYERS } from 'config/layerOrder';

/* Main data & layers */
import Background from 'common/Map/Layers/Background';
import BufferStops from 'common/Map/Layers/BufferStops';
import Terrain from 'common/Map/Layers/Terrain';
import VirtualLayers from 'modules/simulationResult/components/SimulationResultsMap/VirtualLayers';
/* Settings & Buttons */
import Catenaries from 'common/Map/Layers/Catenaries';
import Detectors from 'common/Map/Layers/Detectors';
import Hillshade from 'common/Map/Layers/Hillshade';
import IGN_BD_ORTHO from 'common/Map/Layers/IGN_BD_ORTHO';
import IGN_SCAN25 from 'common/Map/Layers/IGN_SCAN25';
import IGN_CADASTRE from 'common/Map/Layers/IGN_CADASTRE';
import MapButtons from 'common/Map/Buttons/MapButtons';
import NeutralSections from 'common/Map/Layers/NeutralSections';
import OSM from 'common/Map/Layers/OSM';
/* Objects & various */
import colors from 'common/Map/Consts/colors';
import LineSearchLayer from 'common/Map/Layers/LineSearchLayer';
import OperationalPoints from 'common/Map/Layers/OperationalPoints';
import PlatformsLayer from 'common/Map/Layers/Platforms';
import Routes from 'common/Map/Layers/Routes';
import SearchMarker from 'common/Map/Layers/SearchMarker';
import Signals from 'common/Map/Layers/Signals';
import SpeedLimits from 'common/Map/Layers/SpeedLimits';
import SNCF_PSL from 'common/Map/Layers/extensions/SNCF/PSL';
import Switches from 'common/Map/Layers/Switches';
import TracksGeographic from 'common/Map/Layers/TracksGeographic';
import TracksOSM from 'common/Map/Layers/TracksOSM';
import { CUSTOM_ATTRIBUTION } from 'common/Map/const';
import { useMapBlankStyle } from 'common/Map/Layers/blankStyle';

import 'common/Map/Map.scss';

function Map() {
  const mapBlankStyle = useMapBlankStyle();

  const { viewport, mapSearchMarker, mapStyle, showOSM, layersSettings } = useSelector(
    (state: RootState) => state.map
  );
  const [mapLoaded, setMapLoaded] = useState(false);
  const terrain3DExaggeration = useSelector(getTerrain3DExaggeration);
  const mapRef = useRef<MapRef | null>(null);
  const { urlLat, urlLon, urlZoom, urlBearing, urlPitch } = useParams();
  const dispatch = useDispatch();
  const updateViewportChange = useCallback(
    (value: Partial<Viewport>, updateRouter = false) => {
      dispatch(updateViewport(value, `/map`, updateRouter));
    },
    [dispatch]
  );

  const scaleControlStyle = {
    left: 20,
    bottom: 20,
  };

  const resetPitchBearing = () => {
    updateViewportChange({
      ...viewport,
      bearing: 0,
      pitch: 0,
    });
  };

  const defineInteractiveLayers = () => {
    const interactiveLayersLocal = [];
    if (layersSettings.tvds) {
      interactiveLayersLocal.push('chartis/osrd_tvd_section/geo');
    }
    return interactiveLayersLocal;
  };

  /**
   * When the component mount
   * => we check if url has viewport and set it in store
   */
  useEffect(() => {
    // viewport
    const newViewport: Partial<Viewport> = {};
    if (!isNil(urlLat)) newViewport.latitude = parseFloat(urlLat);
    if (!isNil(urlLon)) newViewport.longitude = parseFloat(urlLon);
    if (!isNil(urlZoom)) newViewport.zoom = parseFloat(urlZoom);
    if (!isNil(urlBearing)) newViewport.bearing = parseFloat(urlBearing);
    if (!isNil(urlPitch)) newViewport.pitch = parseFloat(urlPitch);
    if (Object.keys(newViewport).length > 0) updateViewportChange(newViewport);
    // we only do it at mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mastcontainer mastcontainer-map">
      <MapButtons
        map={mapRef.current ?? undefined}
        resetPitchBearing={resetPitchBearing}
        withInfraButton
      />
      <ReactMapGL
        {...viewport}
        ref={mapRef}
        cursor="normal"
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapBlankStyle}
        onMove={(e) => updateViewportChange(e.viewState)}
        onMoveEnd={(e) => updateViewportChange(e.viewState, true)}
        attributionControl={false} // Defined below
        onResize={(e) => {
          updateViewportChange({
            width: e.target.getContainer().offsetWidth,
            height: e.target.getContainer().offsetHeight,
          });
        }}
        interactiveLayerIds={defineInteractiveLayers()}
        touchZoomRotate
        maxPitch={85}
        terrain={
          terrain3DExaggeration
            ? { source: 'terrain', exaggeration: terrain3DExaggeration }
            : undefined
        }
        onLoad={() => {
          setMapLoaded(true);
        }}
        onClick={() => {
          dispatch(updateMapSearchMarker(undefined));
        }}
      >
        <VirtualLayers />
        <AttributionControl customAttribution={CUSTOM_ATTRIBUTION} />
        <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />

        <Background
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
        />
        <Terrain />

        <IGN_BD_ORTHO layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />
        <IGN_SCAN25 layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />
        <IGN_CADASTRE layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />

        {!showOSM ? null : (
          <>
            <OSM
              mapStyle={mapStyle}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
              mapIsLoaded={mapLoaded}
            />
            <Hillshade
              mapStyle={mapStyle}
              layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
              display={terrain3DExaggeration > 0}
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
        />
        <TracksOSM
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.TRACKS_OSM.GROUP]}
        />

        <Routes colors={colors[mapStyle]} layerOrder={LAYER_GROUPS_ORDER[LAYERS.ROUTES.GROUP]} />
        <OperationalPoints
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.OPERATIONAL_POINTS.GROUP]}
        />
        <Catenaries
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.CATENARIES.GROUP]}
        />
        <NeutralSections layerOrder={LAYER_GROUPS_ORDER[LAYERS.DEAD_SECTIONS.GROUP]} />
        <BufferStops
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.BUFFER_STOPS.GROUP]}
        />
        <Detectors
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.DETECTORS.GROUP]}
        />
        <Switches
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.SWITCHES.GROUP]}
        />

        <SpeedLimits
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.SPEED_LIMITS.GROUP]}
        />
        <SNCF_PSL
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.SPEED_LIMITS.GROUP]}
        />

        <Signals
          sourceTable="signals"
          colors={colors[mapStyle]}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.SIGNALS.GROUP]}
        />
        <LineSearchLayer layerOrder={LAYER_GROUPS_ORDER[LAYERS.LINE_SEARCH.GROUP]} />

        {mapSearchMarker && <SearchMarker data={mapSearchMarker} colors={colors[mapStyle]} />}
      </ReactMapGL>
    </main>
  );
}

export default Map;
