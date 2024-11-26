import cx from 'classnames';
import type { Feature, LineString, Position } from 'geojson';
import { Marker, Source } from 'react-map-gl/maplibre';

import destinationIcon from 'assets/pictures/mapMarkers/destination.svg';
import viaIcon from 'assets/pictures/mapMarkers/intermediate-point.svg';
import originIcon from 'assets/pictures/mapMarkers/start.svg';
import OrderedLayer from 'common/Map/Layers/OrderedLayer';

interface RenderItineraryProps {
  geojsonPath: Feature<LineString>;
  pathItemsCoordinates?: Position[];
  layerOrder: number;
}

export default function RenderItinerary({
  geojsonPath,
  pathItemsCoordinates,
  layerOrder,
}: RenderItineraryProps) {
  const paintBackgroundLine = {
    'line-width': 4,
    'line-color': '#EDF9FF',
  };

  const paintLine = {
    'line-width': 1,
    'line-color': '#158DCF',
  };

  const markerOffset: [number, number] = [0, 8];

  if (!pathItemsCoordinates || pathItemsCoordinates.length < 2) {
    return null;
  }

  const [originLongitude, originLatitude] = pathItemsCoordinates.at(0)!;
  const [destinationLongitude, destinationLatitude] = pathItemsCoordinates.at(-1)!;
  const vias = pathItemsCoordinates.slice(1, -1);

  return (
    <Source type="geojson" data={geojsonPath}>
      <Marker
        longitude={originLongitude}
        latitude={originLatitude}
        anchor="bottom"
        offset={markerOffset}
      >
        <img src={originIcon} alt="origin" />
      </Marker>
      {vias.map(([longitude, latitude], index) => (
        <Marker
          key={`via-${index}`}
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          offset={markerOffset}
        >
          <img src={viaIcon} alt={`via ${index + 1}`} />
          <span className={cx('map-pathfinding-marker', 'via-number', 'stdcm-via')}>
            {index + 1}
          </span>
        </Marker>
      ))}
      <Marker
        longitude={destinationLongitude}
        latitude={destinationLatitude}
        anchor="bottom"
        offset={markerOffset}
      >
        <img src={destinationIcon} alt="destination" />
      </Marker>
      <OrderedLayer
        id="geojsonPathBackgroundLine"
        type="line"
        paint={paintBackgroundLine}
        beforeId="geojsonPathLine"
        layerOrder={layerOrder}
      />
      <OrderedLayer id="geojsonPathLine" type="line" paint={paintLine} layerOrder={layerOrder} />
    </Source>
  );
}
