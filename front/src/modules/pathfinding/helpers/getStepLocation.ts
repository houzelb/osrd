import type { PathItemLocation } from 'common/api/osrdEditoastApi';
import { mToMm } from 'utils/physics';

const getStepLocation = (step: PathItemLocation): PathItemLocation => {
  if ('track' in step) {
    // TODO: step offset should be in mm in the store /!\
    // pathfinding blocks endpoint requires offsets in mm
    return { track: step.track, offset: mToMm(step.offset) };
  }
  if ('operational_point' in step) {
    return { operational_point: step.operational_point };
  }
  if ('trigram' in step) {
    return { trigram: step.trigram, secondary_code: step.secondary_code };
  }
  return { uic: step.uic, secondary_code: step.secondary_code };
};

export default getStepLocation;
