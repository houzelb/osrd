import { describe, it, expect } from 'vitest';

import type { TrainScheduleResult } from 'common/api/osrdEditoastApi';

import computeMargins from '../computeMargins';

describe('computeMargins', () => {
  const path = [
    {
      id: 'a',
      uic: 1,
    },
    {
      id: 'b',
      uic: 2,
    },
    {
      id: 'c',
      uic: 3,
    },
  ];
  const margins = { boundaries: ['c'], values: ['10%', '0%'] };
  const pathItemTimes = {
    base: [0, 100 * 1000, 200 * 1000],
    provisional: [0, 110 * 1000, 220 * 1000],
    final: [0, 115 * 1000, 230 * 1000],
  };

  it('should compute simple margin', () => {
    const train = { path, margins } as TrainScheduleResult;
    expect(computeMargins(train, 0, pathItemTimes)).toEqual({
      theoreticalMargin: '10 %',
      theoreticalMarginSeconds: '10 s',
      calculatedMargin: '15 s',
      diffMargins: '5 s',
    });
    expect(computeMargins(train, 1, pathItemTimes)).toEqual({
      theoreticalMargin: '',
      theoreticalMarginSeconds: '20 s',
      calculatedMargin: '30 s',
      diffMargins: '10 s',
    });
    expect(computeMargins(train, 2, pathItemTimes)).toEqual({
      theoreticalMargin: undefined,
      theoreticalMarginSeconds: undefined,
      calculatedMargin: undefined,
      diffMargins: undefined,
    });
  });
});
