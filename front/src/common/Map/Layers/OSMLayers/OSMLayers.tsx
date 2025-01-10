import colors from 'common/Map/Consts/colors';
import { LAYER_GROUPS_ORDER, LAYERS } from 'config/layerOrder';

import Background from './Background';
import Hillshade from './Hillshade';
import OSM from './OSM';
import PlatformsLayer from './Platforms';
import Terrain from './Terrain';
import TracksOSM from './TracksOSM';

type OSMLayersProps = {
  mapStyle: 'normal' | 'dark' | 'blueprint' | 'minimal';
  showOSM: boolean;
  mapIsLoaded?: boolean;
  hidePlatforms?: boolean;
};

const OSMLayers = ({
  mapStyle,
  showOSM,
  mapIsLoaded = true,
  hidePlatforms = false,
}: OSMLayersProps) => (
  <>
    <Background
      colors={colors[mapStyle]}
      layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
    />

    <Terrain />

    {showOSM && (
      <>
        <OSM
          mapStyle={mapStyle}
          layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]}
          mapIsLoaded={mapIsLoaded}
        />
        <Hillshade mapStyle={mapStyle} layerOrder={LAYER_GROUPS_ORDER[LAYERS.BACKGROUND.GROUP]} />
      </>
    )}

    {!hidePlatforms && (
      <PlatformsLayer
        colors={colors[mapStyle]}
        layerOrder={LAYER_GROUPS_ORDER[LAYERS.PLATFORMS.GROUP]}
      />
    )}

    <TracksOSM colors={colors[mapStyle]} layerOrder={LAYER_GROUPS_ORDER[LAYERS.TRACKS_OSM.GROUP]} />
  </>
);

export default OSMLayers;
