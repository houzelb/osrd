import React from 'react';
import { useSelector } from 'react-redux';
import { Source, MapRef } from 'react-map-gl/maplibre';

import { Theme } from 'types';

import { MAP_URL } from 'common/Map/const';

import OrderedLayer from 'common/Map/Layers/OrderedLayer';
import { getInfraID } from 'reducers/osrdconf/selectors';
import { getLayersSettings, getMapStyle } from 'reducers/map/selectors';
import {
  getPointLayerProps,
  getSignalLayerProps,
  getSignalMatLayerProps,
  SignalContext,
} from './geoSignalsLayers';
import configKPLabelLayer from './configKPLabelLayer';

interface PlatformProps {
  colors: Theme;
  sourceTable: string;
  hovered?: { id: string; layer: string };
  mapRef?: React.RefObject<MapRef>;
  layerOrder: number;
}

function Signals(props: PlatformProps) {
  const mapStyle = useSelector(getMapStyle);
  const layersSettings = useSelector(getLayersSettings);
  const infraID = useSelector(getInfraID);
  const { colors, sourceTable, layerOrder } = props;

  const prefix = mapStyle === 'blueprint' ? 'SCHB ' : '';

  const context: SignalContext = {
    prefix,
    colors,
    sourceTable,
  };

  return layersSettings.signals ? (
    <Source
      promoteId="id"
      type="vector"
      url={`${MAP_URL}/layer/${sourceTable}/mvt/geo/?infra=${infraID}`}
    >
      <OrderedLayer
        {...getSignalMatLayerProps(context)}
        id="chartis/signal/mast"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...getPointLayerProps(context)}
        id="chartis/signal/point"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...configKPLabelLayer({
          bottomOffset: 6.5,
          colors,
          fieldName: 'extensions_sncf_kp',
          minzoom: 12,
          isSignalisation: true,
          sourceLayer: sourceTable,
        })}
        id="chartis/signal/kp"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...getSignalLayerProps(context)}
        id="chartis/signal/signals"
        layerOrder={layerOrder}
      />
    </Source>
  ) : null;
}

export default Signals;
