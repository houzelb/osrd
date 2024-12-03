/* eslint-disable import/prefer-default-export */
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import { insertViaFromMap } from 'reducers/osrdconf/helpers';
import type { ConfSliceActions } from 'reducers/osrdconf/osrdConfCommon';
import type { PathStep } from 'reducers/osrdconf/types';
import { store } from 'store';
import { addElementAtIndex, replaceElementAtIndex } from 'utils/array';

export function setPointIti(
  pointType: 'origin' | 'destination' | 'via',
  pathStep: PathStep,
  actions: ConfSliceActions,
  launchPathfinding: (newPathSteps: (PathStep | null)[]) => void,
  pathProperties?: ManageTrainSchedulePathProperties
) {
  const { updateFeatureInfoClick } = actions;
  const { pathSteps } = store.getState().operationalStudiesConf;

  let newPathSteps: (PathStep | null)[];

  switch (pointType) {
    case 'origin':
      newPathSteps = replaceElementAtIndex(pathSteps, 0, pathStep);
      break;
    case 'destination':
      newPathSteps = replaceElementAtIndex(pathSteps, -1, pathStep);
      break;
    default:
      if (pathProperties) {
        newPathSteps = insertViaFromMap(pathSteps, pathStep, pathProperties);
      } else {
        newPathSteps = addElementAtIndex(pathSteps, pathSteps.length - 1, pathStep);
      }
  }
  store.dispatch(updateFeatureInfoClick({ displayPopup: false }));
  launchPathfinding(newPathSteps);
}
