import { Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';

import type { GeoJsonLineString } from 'common/api/osrdEditoastApi';
import OrderedLayer from 'common/Map/Layers/OrderedLayer';
import { useOsrdConfSelectors } from 'common/osrdContext';

type ItineraryLayerProps = {
  layerOrder: number;
  geometry?: GeoJsonLineString;
  hideItineraryLine?: boolean;
  showStdcmAssets: boolean;
  isFeasible?: boolean;
};

const FEASIBLE_COLOR = 'rgba(210, 225, 0, 0.75)';
const INFEASIBLE_COLOR = '#eaa72b';
const STDCM_ASSETS_COLOR = 'rgb(21, 141, 207)';

export default function ItineraryLayer({
  layerOrder,
  geometry,
  hideItineraryLine = false,
  showStdcmAssets,
  isFeasible,
}: ItineraryLayerProps) {
  const { getOrigin, getDestination } = useOsrdConfSelectors();
  const origin = useSelector(getOrigin);
  const destination = useSelector(getDestination);
  if (geometry && origin && destination) {
    const lineWidth = showStdcmAssets ? 3 : 5;

    let lineColor = FEASIBLE_COLOR;
    if (!isFeasible) {
      lineColor = INFEASIBLE_COLOR;
    } else if (showStdcmAssets) {
      lineColor = STDCM_ASSETS_COLOR;
    }
    return (
      <Source type="geojson" data={geometry}>
        {!hideItineraryLine && (
          <OrderedLayer
            type="line"
            paint={{
              'line-width': lineWidth,
              'line-color': lineColor,
            }}
            layerOrder={layerOrder}
          />
        )}
      </Source>
    );
  }
  return null;
}
