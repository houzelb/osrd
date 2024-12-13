import { Source } from 'react-map-gl/maplibre';

import { TERRAIN_URL } from '../const';

export default function Terrain() {
  if (!TERRAIN_URL) {
    return null;
  }
  return (
    <Source
      id="terrain"
      type="raster-dem"
      encoding="terrarium"
      url={TERRAIN_URL}
      tileSize={256}
      maxzoom={12}
    />
  );
}
