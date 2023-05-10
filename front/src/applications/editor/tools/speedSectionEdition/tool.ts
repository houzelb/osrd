import { MdSpeed } from 'react-icons/md';
import { IoMdAddCircleOutline } from 'react-icons/io';
import { cloneDeep, isEmpty, isEqual } from 'lodash';
import { BiReset } from 'react-icons/bi';

import {
  DEFAULT_COMMON_TOOL_STATE,
  LAYER_TO_EDITOAST_DICT,
  LAYERS_SET,
  LayerType,
  Tool,
} from '../types';
import {
  HoveredExtremityState,
  HoveredPanelState,
  HoveredRangeState,
  LpvPanelFeature,
  SpeedSectionEditionState,
  TrackRangeExtremityFeature,
  TrackRangeFeature,
} from './types';
import {
  clickOnLpvPanel,
  getEditSpeedSectionState,
  getLpvPanelNewPosition,
  getMovedLpvEntity,
  getNewSpeedSection,
  getPanelInformationFromInteractionState,
} from './utils';
import {
  SpeedSectionEditionLayers,
  SpeedSectionEditionLeftPanel,
  SpeedSectionMessages,
} from './components';
import { SpeedSectionLpvEntity, TrackSectionEntity } from '../../../../types';
import { getNearestPoint } from '../../../../utils/mapboxHelper';
import { approximateDistanceWithEditoastData } from '../utils';

const SpeedSectionEditionTool: Tool<SpeedSectionEditionState> = {
  id: 'speed-edition',
  icon: MdSpeed,
  labelTranslationKey: 'Editor.tools.speed-edition.label',
  requiredLayers: new Set(['speed_sections', 'lpv', 'lpv_panels']),

  getInitialState() {
    return getEditSpeedSectionState(getNewSpeedSection());
  },

  actions: [
    [
      {
        id: 'new-speed-section',
        icon: IoMdAddCircleOutline,
        labelTranslationKey: 'Editor.tools.speed-edition.actions.new-speed-section',
        onClick({ setState }) {
          const entity = getNewSpeedSection();

          setState({
            ...DEFAULT_COMMON_TOOL_STATE,
            entity,
            initialEntity: entity,
          });
        },
      },
      {
        id: 'reset-speed-section',
        icon: BiReset,
        labelTranslationKey: 'Editor.tools.speed-edition.actions.reset-speed-section',
        isDisabled({ state: { entity, initialEntity } }) {
          return isEqual(entity, initialEntity);
        },
        onClick({ setState, state: { initialEntity } }) {
          setState({
            entity: cloneDeep(initialEntity),
          });
        },
      },
    ],
  ],

  getCursor({ state: { hoveredItem, interactionState } }) {
    if (interactionState.type !== 'moveRangeExtremity' && hoveredItem) return 'pointer';
    if (interactionState.type === 'moveRangeExtremity') return 'grabbing';
    return 'default';
  },
  onClickMap(e, { setState, state: { entity, interactionState } }) {
    const feature = (e.features || [])[0];

    if (['moveRangeExtremity', 'movePanel'].includes(interactionState.type)) {
      setState({ interactionState: { type: 'idle' } });
    } else if (feature) {
      if (feature.properties?.speedSectionItemType === 'TrackRangeExtremity') {
        const hoveredExtremity = feature as unknown as TrackRangeExtremityFeature;
        setState({
          hoveredItem: null,
          interactionState: {
            type: 'moveRangeExtremity',
            rangeIndex: hoveredExtremity.properties.speedSectionRangeIndex,
            extremity: hoveredExtremity.properties.extremity,
          },
        });
      } else if (feature.properties?.speedSectionItemType === 'LPVPanel') {
        /**
         * TODO: Si on clique sur un panneau, on passe en mode "bouger le panneau"
         * - tester si la feature est bien un panneau LPV
         * - si oui, on update le state pour passer hoveredItem à null et updater le interactionState
         *   (cf le travail de ce matin)
         */
        const lpvPanelFeature = feature as unknown as LpvPanelFeature;
        clickOnLpvPanel(lpvPanelFeature, setState);
      } else if (feature.properties?.speedSectionItemType === 'TrackRange') {
        const hoveredRange = feature as unknown as TrackRangeFeature;
        const newEntity = cloneDeep(entity);
        newEntity.properties.track_ranges?.splice(
          hoveredRange.properties.speedSectionRangeIndex,
          1
        );
        setState({ entity: newEntity, hoveredItem: null });
      } else if (feature.sourceLayer === 'track_sections') {
        const clickedEntity = feature as unknown as TrackSectionEntity;
        if (
          (entity.properties.track_ranges || []).find(
            (range) => range.track === clickedEntity.properties.id
          )
        )
          return;

        const newEntity = cloneDeep(entity);
        newEntity.properties.track_ranges = newEntity.properties.track_ranges || [];
        newEntity.properties.track_ranges.push({
          track: clickedEntity.properties.id,
          begin: 0,
          end: clickedEntity.properties.length,
          applicable_directions: 'BOTH',
        });
        setState({
          entity: newEntity,
        });
      }
    }
  },
  onKeyDown(e, { setState, state: { interactionState } }) {
    if (e.code === 'Escape' && interactionState.type === 'moveRangeExtremity')
      setState({ interactionState: { type: 'idle' } });
  },
  onHover(e, { setState, state: { hoveredItem, trackSectionsCache, interactionState } }) {
    if (interactionState.type === 'moveRangeExtremity') return;

    const feature = (e.features || [])[0];

    if (!feature) {
      if (hoveredItem) setState({ hoveredItem: null });
      return;
    }

    // Handle hovering custom elements:
    if (feature.properties?.speedSectionItemType === 'TrackRangeExtremity') {
      const hoveredExtremity = feature as unknown as TrackRangeExtremityFeature;
      const trackState = trackSectionsCache[hoveredExtremity.properties.track];
      if (trackState?.type !== 'success') return;

      const newHoveredItem: HoveredExtremityState = {
        speedSectionItemType: 'TrackRangeExtremity',
        extremity: hoveredExtremity.properties.extremity,
        position: hoveredExtremity.geometry.coordinates,
        track: trackState.track,
      };
      if (!isEqual(newHoveredItem, hoveredItem))
        setState({
          hoveredItem: newHoveredItem,
        });
    } else if (feature.properties?.speedSectionItemType === 'TrackRange') {
      const hoveredRange = feature as unknown as TrackRangeFeature;
      const trackState = trackSectionsCache[hoveredRange.properties.track];
      if (trackState?.type !== 'success') return;

      const newHoveredItem: HoveredRangeState = {
        speedSectionItemType: 'TrackRange',
        position: e.lngLat.toArray(),
        track: trackState.track,
      };
      if (!isEqual(newHoveredItem, hoveredItem))
        setState({
          hoveredItem: newHoveredItem,
        });
    } else if (feature.properties?.speedSectionItemType === 'LPVPanel') {
      const hoveredExtremity = feature as unknown as TrackRangeExtremityFeature;
      const trackState = trackSectionsCache[hoveredExtremity.properties.track];
      if (trackState?.type !== 'success') return;

      const newHoveredItem: HoveredPanelState = {
        speedSectionItemType: 'LPVPanel',
        position: hoveredExtremity.geometry.coordinates,
        track: trackState.track,
        panelIndex: feature.properties?.speedSectionPanelIndex as number,
        panelType: feature.properties?.speedSectionPanelType as string,
      };
      if (!isEqual(newHoveredItem, hoveredItem))
        setState({
          hoveredItem: newHoveredItem,
        });
    }

    // Handle hovering EditorEntity elements:
    else if (LAYERS_SET.has(feature.sourceLayer)) {
      const newHoveredItem = {
        id: feature.properties?.id as string,
        type: LAYER_TO_EDITOAST_DICT[feature.sourceLayer as LayerType],
        renderedEntity: feature,
      };
      if (!isEqual(newHoveredItem, hoveredItem))
        setState({
          hoveredItem: newHoveredItem,
        });
    }

    // Handle other cases:
    else if (hoveredItem) {
      setState({ hoveredItem: null });
    }
  },
  onMove(e, { setState, state: { entity, interactionState, hoveredItem, trackSectionsCache } }) {
    console.log('on move qqch');
    if (interactionState.type === 'moveRangeExtremity') {
      const range = (entity.properties?.track_ranges || [])[interactionState.rangeIndex];
      if (!range) return;

      const trackState = trackSectionsCache[range.track];
      if (trackState?.type !== 'success') return;

      const { track } = trackState;
      const nearestPoint = getNearestPoint([track], e.lngLat.toArray());

      const newEntity = cloneDeep(entity);
      const newRange = (newEntity.properties?.track_ranges || [])[interactionState.rangeIndex];

      const distanceAlongTrack = approximateDistanceWithEditoastData(track, nearestPoint.geometry);
      newRange[interactionState.extremity === 'BEGIN' ? 'begin' : 'end'] = distanceAlongTrack;
      setState({
        entity: newEntity,
      });
    } else if (interactionState.type === 'movePanel') {
      /**
       * TODO: Si on est mode "bouger le panneau", on doit bouger le panneau
       * Copier le code de tool-factory.ts lines 126 à 137
       * - à partir de la position de la souris, détecter les trackRanges autour
       * - trouver le point le plus proche entre la souris et les trackRanges en question
       *   (nouvelle position du panneau)
       * - trouver la trackSection sur laquelle se trouve le point depuis nearestPoint
       * - interpoler sur la nouvelle position (vérifier qu'il n'y a pas d'incohérence avec editoast)
       * - modifier le state en lui donnant comme entity une nouvelle entity avec la nouvelle position
       *   & la nouvelle trackRange si nécessaire
       */
      if (entity.properties.extensions?.lpv_sncf) {
        const newPosition = getLpvPanelNewPosition(e, trackSectionsCache);
        if (newPosition) {
          const panelInfo = getPanelInformationFromInteractionState(interactionState);
          const updatedEntity = getMovedLpvEntity(
            entity as SpeedSectionLpvEntity,
            panelInfo,
            newPosition
          );
          setState({ entity: updatedEntity });
        }
      }
    } else if (hoveredItem) {
      setState({ hoveredItem: null });
    }
  },

  messagesComponent: SpeedSectionMessages,
  layersComponent: SpeedSectionEditionLayers,
  leftPanelComponent: SpeedSectionEditionLeftPanel,
  getInteractiveLayers() {
    return ['editor/geo/track-main'];
  },
};

export default SpeedSectionEditionTool;
