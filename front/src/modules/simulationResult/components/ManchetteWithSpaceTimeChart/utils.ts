import type { PathLevel } from '@osrd-project/ui-spacetimechart';
import type { HoveredItem } from '@osrd-project/ui-spacetimechart/dist/lib/types';

import { PATH_COLORS } from 'modules/simulationResult/consts';

/* eslint-disable import/prefer-default-export */
export const getIdFromTrainPath = (trainPath: string): number => +trainPath.split('-')[0];

export const getPathStyle = (
  hovered: HoveredItem | null,
  path: { color: string; id: string },
  dragging: boolean
): { color: string; level?: PathLevel } => {
  if (hovered && 'pathId' in hovered.element && path.id === hovered?.element.pathId && !dragging) {
    return { color: PATH_COLORS.HOVERED_PATH, level: 1 };
  }
  return { color: path.color };
};
