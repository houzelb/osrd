import { COMPOSITION_CODES_MAX_SPEEDS } from '../consts';

/**
 * Get max speed in km/h from speedLimitByTag
 * @param speedLimitByTag - A string representing the speed limit tag
 * @returns The max speed in km/h, or undefined if not applicable
 */
const maxSpeedFromSpeedLimitByTag = (speedLimitByTag?: string | null): number | undefined => {
  if (!speedLimitByTag) return undefined;
  return COMPOSITION_CODES_MAX_SPEEDS[speedLimitByTag] ?? undefined;
};

export default maxSpeedFromSpeedLimitByTag;
