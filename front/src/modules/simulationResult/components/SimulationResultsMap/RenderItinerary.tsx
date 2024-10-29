import type { Feature, LineString } from 'geojson';
import { Marker, Source } from 'react-map-gl/maplibre';

import destinationIcon from 'assets/pictures/mapMarkers/destination.svg';
import originIcon from 'assets/pictures/mapMarkers/start.svg';
import OrderedLayer from 'common/Map/Layers/OrderedLayer';

interface RenderItineraryProps {
  geojsonPath: Feature<LineString>;
  layerOrder: number;
}

export default function RenderItinerary(props: RenderItineraryProps) {
  const { geojsonPath, layerOrder } = props;

  const paintBackgroundLine = {
    'line-width': 4,
    'line-color': '#EDF9FF',
  };

  const paintLine = {
    'line-width': 1,
    'line-color': '#158DCF',
  };

  // We know we have a geometry so we have at least 2 coordinates
  const [startLongitude, startLatitude] = geojsonPath.geometry.coordinates.at(0)!;
  const [endLongitude, endLatitude] = geojsonPath.geometry.coordinates.at(-1)!;

  return (
    <Source type="geojson" data={geojsonPath}>
      <Marker longitude={startLongitude} latitude={startLatitude} anchor="bottom">
        <img src={originIcon} alt="origin" />
      </Marker>
      <OrderedLayer
        id="geojsonPathBackgroundLine"
        type="line"
        paint={paintBackgroundLine}
        beforeId="geojsonPathLine"
        layerOrder={layerOrder}
      />
      <OrderedLayer id="geojsonPathLine" type="line" paint={paintLine} layerOrder={layerOrder} />
      <Marker longitude={endLongitude} latitude={endLatitude} anchor="bottom">
        <img src={destinationIcon} alt="destination" />
      </Marker>
    </Source>
  );
}
