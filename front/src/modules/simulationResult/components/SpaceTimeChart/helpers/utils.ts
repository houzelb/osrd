import type { LayerRangeData } from '../../../types';

const cutSpaceTimeRect = (
  range: LayerRangeData,
  minSpace: number,
  maxSpace: number
): LayerRangeData | null => {
  let { timeStart, timeEnd, spaceStart, spaceEnd } = range;

  if (spaceEnd <= minSpace || spaceStart >= maxSpace) {
    return null;
  }

  if (spaceStart < minSpace) {
    const interpolationFactor = (minSpace - spaceStart) / (spaceEnd - spaceStart);
    spaceStart = minSpace;
    timeStart += (timeEnd - timeStart) * interpolationFactor;
  }

  if (spaceEnd > maxSpace) {
    const interpolationFactor = (spaceEnd - maxSpace) / (spaceEnd - spaceStart);
    spaceEnd = maxSpace;
    timeEnd -= (timeEnd - timeStart) * interpolationFactor;
  }

  return {
    spaceStart,
    spaceEnd,
    timeStart,
    timeEnd,
  };
};

export default cutSpaceTimeRect;
