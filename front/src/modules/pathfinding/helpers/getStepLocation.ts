import type { PathItemLocation } from 'common/api/osrdEditoastApi';
import type { PathStep, StdcmPathStep } from 'reducers/osrdconf/types';
import { mToMm } from 'utils/physics';

const getStepLocation = (step: PathStep | StdcmPathStep): PathItemLocation => {
  if ('track' in step) {
    return { track: step.track, offset: mToMm(step.offset) };
  }
  if ('operational_point' in step) {
    return { operational_point: step.operational_point };
  }
  if ('trigram' in step) {
    return { trigram: step.trigram, secondary_code: step.ch };
  }
  if (step.uic === -1) {
    throw new Error('Invalid UIC');
  }
  return { uic: step.uic, secondary_code: step.ch };
};

export default getStepLocation;
