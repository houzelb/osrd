/* eslint-disable import/prefer-default-export */
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import { insertViaFromMap } from 'reducers/osrdconf/helpers';
import type { PathStep } from 'reducers/osrdconf/types';
import { store } from 'store';
import { addElementAtIndex, replaceElementAtIndex } from 'utils/array';

export function setPointIti(
  pointType: 'origin' | 'destination' | 'via',
  pathStep: PathStep,
  launchPathfinding: (newPathSteps: (PathStep | null)[]) => void,
  resetFeatureInfoClick: () => void,
  pathProperties?: ManageTrainSchedulePathProperties
) {
  const { pathSteps } = store.getState().operationalStudiesConf;
  console.log(pathStep, 'initial pathStep in set point iti');
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
        console.log('New pathSteps after insertViaFromMap:', newPathSteps);
      } else {
        newPathSteps = addElementAtIndex(pathSteps, pathSteps.length - 1, pathStep);
      }
  }
  console.log('final new pathsteps', newPathSteps);
  resetFeatureInfoClick();
  launchPathfinding(newPathSteps);
}
