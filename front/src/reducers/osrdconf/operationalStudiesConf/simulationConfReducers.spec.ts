import { describe, it, expect } from 'vitest';

import type { LightRollingStockWithLiveries } from 'common/api/osrdEditoastApi';
import type { TrainScheduleWithDetails } from 'modules/trainschedule/components/Timetable/types';
import { operationalStudiesConfSlice } from 'reducers/osrdconf/operationalStudiesConf';
import { defaultCommonConf } from 'reducers/osrdconf/osrdConfCommon';
import testCommonConfReducers from 'reducers/osrdconf/osrdConfCommon/__tests__/utils';
import { createStoreWithoutMiddleware } from 'store';

const createStore = () =>
  createStoreWithoutMiddleware({
    [operationalStudiesConfSlice.name]: {
      ...defaultCommonConf,
    },
  });

describe('simulationConfReducer', () => {
  it('should return initial state', () => {
    const store = createStore();
    const state = store.getState()[operationalStudiesConfSlice.name];
    expect(state).toEqual(defaultCommonConf);
  });

  it('selectTrainToEdit', () => {
    const trainSchedule: TrainScheduleWithDetails = {
      id: 1,
      trainName: 'train1',
      constraint_distribution: 'MARECO',
      start_time: '2021-01-01T00:00:00Z',
      rollingStock: { id: 1, name: 'rollingStock1' } as LightRollingStockWithLiveries,
      path: [
        { id: 'id1', uic: 123 },
        { id: 'id2', uic: 234 },
      ],
      margins: { boundaries: ['id2'], values: ['10%', '0%'] },
      startTime: new Date('2021-01-01T00:00:00Z'),
      arrivalTime: null,
      duration: 1000,
      stopsCount: 2,
      pathLength: '100',
      mechanicalEnergyConsumed: 100,
      speedLimitTag: 'MA100',
      labels: ['label1'],
      isValid: true,
      options: { use_electrical_profiles: false },
    };

    const store = createStore();
    store.dispatch(operationalStudiesConfSlice.actions.selectTrainToEdit(trainSchedule));

    const state = store.getState()[operationalStudiesConfSlice.name];
    expect(state).toEqual({
      ...defaultCommonConf,
      usingElectricalProfiles: false,
      labels: ['label1'],
      rollingStockID: 1,
      speedLimitByTag: 'MA100',
      name: 'train1',
      pathSteps: [
        {
          id: 'id1',
          uic: 123,
          name: '123',
          theoreticalMargin: '10%',
          ch: undefined,
          arrival: undefined,
          stopFor: undefined,
          locked: undefined,
          receptionSignal: undefined,
        },
        {
          id: 'id2',
          uic: 234,
          name: '234',
          theoreticalMargin: undefined,
          ch: undefined,
          arrival: undefined,
          stopFor: undefined,
          locked: undefined,
          receptionSignal: undefined,
        },
      ],
      startTime: '2021-01-01T00:00:00+00:00',
    });
  });

  testCommonConfReducers(operationalStudiesConfSlice);
});
