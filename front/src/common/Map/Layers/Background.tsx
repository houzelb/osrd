import { Source, type LayerProps } from 'react-map-gl/maplibre';

import OrderedLayer from 'common/Map/Layers/OrderedLayer';
import type { Theme } from 'types';
import { OSM_URL } from '../const';

interface BackgroundProps {
  colors: Theme;
  layerOrder?: number;
}

function Background(props: BackgroundProps) {
  const { colors, layerOrder } = props;

  const backgroundParams: LayerProps = {
    id: 'osm/background',
    type: 'background',
    layout: {
      visibility: 'visible',
    },
    paint: {
      'background-color': colors.background.color,
    },
  };

  return (
    <Source id="platform" type="vector" url={OSM_URL} source-layer="transportation">
      <OrderedLayer {...backgroundParams} layerOrder={layerOrder} />
    </Source>
  );
}

export default Background;
