/**
 * Get max speed in km/h from speedLimitByTag
 * @param speedLimitByTag - A string representing the speed limit tag
 * @returns The max speed in km/h, or undefined if not applicable
 */
const maxSpeedFromSpeedLimitByTag = (speedLimitByTag?: string | null): number | undefined => {
  if (!speedLimitByTag) return undefined;

  const speedMap: Record<string, number | undefined> = {
    MA80: 80,
    MA90: 90,
    MA100: 100,
    ME100: 100,
    ME120: 120,
    ME140: 140,
    ME160: 160,
    HLP: undefined,
    MVGV: undefined,
  };

  return speedMap[speedLimitByTag] ?? undefined;
};

export default maxSpeedFromSpeedLimitByTag;
