import { describe, it, expect } from 'vitest';

import type { ReceptionSignal } from 'common/api/osrdEditoastApi';

import { formatSchedule } from '../scheduleData';

describe('formatScheduleTime', () => {
  it('should return empty objecty if schedule is undefined', () => {
    const arrivalTime = new Date();

    expect(formatSchedule(arrivalTime)).toEqual({
      stopFor: undefined,
      shortSlipDistance: false,
      onStopSignal: false,
      calculatedDeparture: undefined,
    });
  });

  it('should compute simple arrival time in the correct timezone', () => {
    const arrivalTime = new Date('2022-01-01T02:03:00');
    const schedule = {
      at: 'id325',
      stop_for: 'PT100S',
      reception_signal: 'OPEN' as ReceptionSignal,
    };

    expect(formatSchedule(arrivalTime, schedule)).toEqual({
      calculatedDeparture: '02:04:40',
      stopFor: '100',
      shortSlipDistance: false,
      onStopSignal: false,
    });
  });
});
