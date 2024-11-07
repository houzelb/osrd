import { describe, it, expect } from 'vitest';

import { ISO8601Duration2sec, calculateTimeDifferenceInDays } from 'utils/timeManipulation';

describe('ISO8601Duration2sec', () => {
  it('should handle only seconds', () => {
    expect(ISO8601Duration2sec('PT5S')).toEqual(5);
  });
  it('should handle only min', () => {
    // 1min = 60s
    expect(ISO8601Duration2sec('PT5M')).toEqual(300);
  });
  it('should handle only hours', () => {
    // 1h = 60min
    expect(ISO8601Duration2sec('PT1H')).toEqual(3600);
  });
  it('should handle hours, mins and seconds', () => {
    expect(ISO8601Duration2sec('PT1H1M1S')).toEqual(3661);
  });
  it('should handle hours and seconds without min', () => {
    expect(ISO8601Duration2sec('PT1H1S')).toEqual(3601);
  });
});

describe('calculateTimeDifferenceInDays', () => {
  it('should handle undefined dates', () => {
    expect(calculateTimeDifferenceInDays(undefined, new Date(2024, 1, 1, 15))).toEqual(undefined);
    expect(calculateTimeDifferenceInDays(new Date(2024, 1, 1, 15), undefined)).toEqual(undefined);
    expect(calculateTimeDifferenceInDays(undefined, undefined)).toEqual(undefined);
  });
  it('should handle 2 dates on the same day', () => {
    expect(
      calculateTimeDifferenceInDays(new Date(2024, 1, 1, 10), new Date(2024, 1, 1, 15))
    ).toEqual(0);
  });
  it('should handle 2 dates not on the same day', () => {
    expect(
      calculateTimeDifferenceInDays(new Date(2024, 1, 1, 10), new Date(2024, 1, 4, 15))
    ).toEqual(3);
  });
  it('should handle 2 dates not on the same day with less than a day in duration', () => {
    expect(
      calculateTimeDifferenceInDays(new Date(2024, 1, 1, 23), new Date(2024, 1, 2, 2))
    ).toEqual(1);
  });
});
