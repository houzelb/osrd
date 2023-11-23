import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { Source, CircleLayer, SymbolLayer } from 'react-map-gl/maplibre';

import { Theme, OmitLayer } from 'types';
import { MAP_URL } from 'common/Map/const';

import OrderedLayer from 'common/Map/Layers/OrderedLayer';
import { getInfraID } from 'reducers/osrdconf/selectors';
import { getLayersSettings } from 'reducers/map/selectors';

export function getDetectorsLayerProps(params: {
  colors: Theme;
  sourceTable?: string;
}): OmitLayer<CircleLayer> {
  const res: OmitLayer<CircleLayer> = {
    type: 'circle',
    paint: {
      'circle-stroke-color': params.colors.detectors.circle,
      'circle-color': params.colors.detectors.circle,
      'circle-radius': 4,
    },
  };

  if (typeof params.sourceTable === 'string') res['source-layer'] = params.sourceTable;
  return res;
}

export function getDetectorsNameLayerProps(params: {
  colors: Theme;
  sourceTable?: string;
  editor?: boolean;
}): OmitLayer<SymbolLayer> {
  const res: OmitLayer<SymbolLayer> = {
    type: 'symbol',
    minzoom: 8,
    layout: {
      'text-field': !params.editor
        ? '{extensions_sncf_kp}'
        : [
            'format',
            ['get', 'id'],
            { 'font-scale': 1 },
            '\n',
            {},
            ['get', 'extensions_sncf_kp'],
            { 'font-scale': 0.8 },
          ],
      'text-font': ['Roboto Condensed'],
      'text-size': 10,
      'text-justify': 'left',
      'text-anchor': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.5, 0.2],
      visibility: 'visible',
    },
    paint: {
      'text-color': params.colors.detectors.text,
      'text-halo-width': 1,
      'text-halo-color': params.colors.detectors.halo,
      'text-halo-blur': 1,
    },
  };

  if (typeof params.sourceTable === 'string') res['source-layer'] = params.sourceTable;
  return res;
}

interface DetectorsProps {
  colors: Theme;
  layerOrder: number;
}

const Detectors: FC<DetectorsProps> = ({ colors, layerOrder }) => {
  const infraID = useSelector(getInfraID);
  const layersSettings = useSelector(getLayersSettings);

  const layerPoint = getDetectorsLayerProps({ colors, sourceTable: 'detectors' });
  const layerName = getDetectorsNameLayerProps({ colors, sourceTable: 'detectors' });

  return layersSettings.detectors ? (
    <Source
      id="osrd_detectors_geo"
      type="vector"
      url={`${MAP_URL}/layer/detectors/mvt/geo/?infra=${infraID}`}
    >
      <OrderedLayer {...layerPoint} id="chartis/osrd_detectors/geo" layerOrder={layerOrder} />
      <OrderedLayer {...layerName} id="chartis/osrd_detectors_name/geo" layerOrder={layerOrder} />
    </Source>
  ) : null;
};

export default Detectors;
