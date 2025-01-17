import { isNil } from 'lodash';
import { Source, type LayerProps } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';

import { MAP_URL } from 'common/Map/const';
import getKPLabelLayerProps from 'common/Map/Layers/KPLabel';
import OrderedLayer from 'common/Map/Layers/OrderedLayer';
import { getLayersSettings } from 'reducers/map/selectors';
import type { Theme } from 'types';

type OperationalPointsProps = {
  colors: Theme;
  layerOrder: number;
  infraID: number | undefined;
  operationnalPointId?: string;
  overrideStore?: boolean;
};

const OperationalPointsLayer = ({
  colors,
  layerOrder,
  infraID,
  operationnalPointId,
  overrideStore = false,
}: OperationalPointsProps) => {
  const layersSettings = useSelector(getLayersSettings);

  if ((!overrideStore && !layersSettings.operationalpoints) || isNil(infraID)) return null;

  const point: LayerProps = {
    type: 'circle',
    'source-layer': 'operational_points',
    minzoom: 8,
    paint: {
      'circle-stroke-color': colors.op.circle,
      'circle-stroke-width': 2,
      'circle-color': 'rgba(255, 255, 255, 0)',
      'circle-radius': 3,
    },
  };

  const name: LayerProps = {
    type: 'symbol',
    'source-layer': 'operational_points',
    minzoom: 9.5,
    layout: {
      'text-field': [
        'concat',
        ['get', 'extensions_identifier_name'],
        ' / ',
        ['get', 'extensions_sncf_trigram'],
        [
          'case',
          ['in', ['get', 'extensions_sncf_ch'], ['literal', ['BV', '00']]],
          '',
          ['concat', ' ', ['get', 'extensions_sncf_ch']],
        ],
      ],
      'text-font': [
        'case',
        ['==', ['get', 'id'], operationnalPointId || ''],
        ['literal', ['Roboto Bold']],
        ['literal', ['Roboto Condensed']],
      ],
      'text-size': 12,
      'text-anchor': 'left',
      'text-justify': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.75, 0.1],
      'text-max-width': 32,
    },
    paint: {
      'text-color': colors.op.text,
      'text-halo-width': 2,
      'text-halo-color': colors.op.halo,
      'text-halo-blur': 1,
    },
  };

  const yardName: LayerProps = {
    type: 'symbol',
    'source-layer': 'operational_points',
    minzoom: 9.5,
    filter: ['!', ['in', ['get', 'extensions_sncf_ch'], ['literal', ['BV', '00']]]],
    layout: {
      'text-field': '{extensions_sncf_ch_long_label}',
      'text-font': ['Roboto Condensed'],
      'text-size': 10,
      'text-anchor': 'left',
      'text-justify': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.85, 1.9],
      'text-max-width': 32,
    },
    paint: {
      'text-color': colors.op.minitext,
      'text-halo-width': 2,
      'text-halo-color': colors.op.halo,
      'text-halo-blur': 1,
    },
  };

  const trigram: LayerProps = {
    type: 'symbol',
    'source-layer': 'operational_points',
    maxzoom: 9.5,
    minzoom: 7,
    layout: {
      'text-field': [
        'concat',
        ['get', 'extensions_sncf_trigram'],
        ' ',
        [
          'case',
          ['in', ['get', 'extensions_sncf_ch'], ['literal', ['BV', '00']]],
          '',
          ['get', 'extensions_sncf_ch'],
        ],
      ],
      'text-font': [
        'case',
        ['==', ['get', 'id'], operationnalPointId || ''],
        ['literal', ['Roboto Bold']],
        ['literal', ['Roboto Condensed']],
      ],
      'text-size': 11,
      'text-anchor': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.75, 0.1],
    },
    paint: {
      'text-color': colors.op.text,
      'text-halo-width': 2,
      'text-halo-color': colors.op.halo,
      'text-halo-blur': 1,
    },
  };

  return (
    <Source
      id="osrd_operational_point_geo"
      type="vector"
      url={`${MAP_URL}/layer/operational_points/mvt/geo/?infra=${infraID}`}
    >
      <OrderedLayer {...point} id="chartis/osrd_operational_point/geo" layerOrder={layerOrder} />
      <OrderedLayer
        {...yardName}
        id="chartis/osrd_operational_point_yardname/geo"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...name}
        id="chartis/osrd_operational_point_name_short/geo"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...trigram}
        id="chartis/osrd_operational_point_name/geo"
        layerOrder={layerOrder}
      />
      <OrderedLayer
        {...getKPLabelLayerProps({
          colors,
          minzoom: 9.5,
          sourceTable: 'operational_points',
        })}
        id="chartis/osrd_operational_point_kp/geo"
        layerOrder={layerOrder}
      />
    </Source>
  );
};

export default OperationalPointsLayer;
