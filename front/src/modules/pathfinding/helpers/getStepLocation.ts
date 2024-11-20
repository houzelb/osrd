import type { PathItemLocation } from 'common/api/osrdEditoastApi';
import { mToMm } from 'utils/physics';

const getStepLocation = (step: PathItemLocation): PathItemLocation => {
  if ('track' in step) {
    // TODO: step offset should be in mm in the store /!\
    // pathfinding blocks endpoint requires offsets in mm
    return { track: step.track, offset: mToMm(step.offset) };
  }
  if ('operational_point' in step) {
    return { operational_point: step.operational_point, track_reference: step.track_reference };
  }
  if ('trigram' in step) {
    return {
      trigram: step.trigram,
      secondary_code: step.secondary_code,
      track_reference: step.track_reference,
    };
  }
  if (step.uic === -1) {
    throw new Error('Invalid UIC');
  }
  return {
    uic: step.uic,
    secondary_code: step.secondary_code,
    track_reference: step.track_reference,
  };
};

export default getStepLocation;
