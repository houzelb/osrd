import nextId from 'react-id-generator';
import { describe, it, expect } from 'vitest';

import { ArrivalTimeTypes, MarginType, StdcmStopTypes } from 'applications/stdcm/types';
import getStepLocation from 'modules/pathfinding/helpers/getStepLocation';
import {
  stdcmConfInitialState,
  stdcmConfSlice,
  stdcmConfSliceActions,
} from 'reducers/osrdconf/stdcmConf';
import type { OsrdStdcmConfState, StandardAllowance, StdcmPathStep } from 'reducers/osrdconf/types';
import { createStoreWithoutMiddleware } from 'store';

import commonConfBuilder from '../osrdConfCommon/__tests__/commonConfBuilder';
import testCommonConfReducers from '../osrdConfCommon/__tests__/utils';

const createStore = (initialStateExtra?: Partial<OsrdStdcmConfState>) =>
  createStoreWithoutMiddleware({
    [stdcmConfSlice.name]: {
      ...stdcmConfInitialState,
      ...initialStateExtra,
    },
  });

function stdcmConfTestDataBuilder() {
  return {
    buildPercentageStandardAllowance: (value: number): StandardAllowance => ({
      value,
      type: MarginType.PERCENTAGE,
    }),
    buildTimeStandardAllowance: (value: number): StandardAllowance => ({
      value,
      type: MarginType.TIME_PER_DISTANCE,
    }),
  };
}

const testDataBuilder = {
  ...stdcmConfTestDataBuilder(),
  ...commonConfBuilder(),
};

const pathSteps = testDataBuilder.buildPathSteps();
const stdcmPathSteps = pathSteps.map(
  (step, index) =>
    ({
      ...step,
      ...(index === 0 || index === pathSteps.length - 1
        ? {
            isVia: false,
            arrivalType: ArrivalTimeTypes.PRECISE_TIME,
          }
        : {
            isVia: true,
            stopType: StdcmStopTypes.PASSAGE_TIME,
          }),
    }) as StdcmPathStep
);
const [_brest, rennes, _lemans, paris] = pathSteps;

const initialStateSTDCMConfig = {
  rollingStockID: 10,
  speedLimitByTag: 'init-tag',
  stdcmPathSteps,
};

describe('stdcmConfReducers', () => {
  it('should return initial state', () => {
    const store = createStore();
    const state = store.getState()[stdcmConfSlice.name];
    expect(state).toEqual(stdcmConfInitialState);
  });

  describe('should handle margins update', () => {
    it('should handle updateStandardAllowance', () => {
      const initialTimeStandardAllowance = testDataBuilder.buildTimeStandardAllowance(10);
      const store = createStore({
        margins: { standardAllowance: initialTimeStandardAllowance },
      });

      const stateBefore = store.getState()[stdcmConfSlice.name];
      expect(stateBefore.margins.standardAllowance).toBe(initialTimeStandardAllowance);

      const newStandardAllowance = testDataBuilder.buildPercentageStandardAllowance(5);
      store.dispatch(stdcmConfSliceActions.updateStandardAllowance(newStandardAllowance));

      const stateAfter = store.getState()[stdcmConfSlice.name];
      expect(stateAfter.margins.standardAllowance).toBe(newStandardAllowance);
    });

    it('should handle updateGridMarginBefore', () => {
      const newGridMarginBefore = 5;
      const store = createStore(initialStateSTDCMConfig);
      store.dispatch(stdcmConfSliceActions.updateGridMarginBefore(newGridMarginBefore));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.margins.gridMarginBefore).toStrictEqual(newGridMarginBefore);
    });

    it('should handle updateGridMarginAfter', () => {
      const newGridMarginAfter = 5;
      const store = createStore(initialStateSTDCMConfig);
      store.dispatch(stdcmConfSliceActions.updateGridMarginAfter(newGridMarginAfter));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.margins.gridMarginAfter).toStrictEqual(newGridMarginAfter);
    });
  });

  it('should handle resetStdcmConfig', () => {
    const store = createStore(initialStateSTDCMConfig);
    store.dispatch(stdcmConfSliceActions.resetStdcmConfig());

    const state = store.getState()[stdcmConfSlice.name];
    expect(state.rollingStockID).toBe(stdcmConfInitialState.rollingStockID);
    expect(state.stdcmPathSteps).toBe(stdcmConfInitialState.stdcmPathSteps);
    expect(state.speedLimitByTag).toBe(stdcmConfInitialState.speedLimitByTag);
  });

  it('should handle updateStdcmConfigWithData', () => {
    const store = createStore(initialStateSTDCMConfig);
    const parisStdcm = {
      id: nextId(),
      isVia: false,
      arrivalType: ArrivalTimeTypes.PRECISE_TIME,
      location: {
        ...getStepLocation(paris),
        coordinates: paris.coordinates as [number, number],
        name: paris.id,
      },
    } as StdcmPathStep;
    const rennesStdcm = {
      id: nextId(),
      isVia: false,
      arrivalType: ArrivalTimeTypes.ASAP,
      location: {
        ...getStepLocation(rennes),
        coordinates: rennes.coordinates as [number, number],
        name: rennes.id,
      },
    } as StdcmPathStep;
    store.dispatch(
      stdcmConfSliceActions.updateStdcmConfigWithData({
        rollingStockID: 20,
        stdcmPathSteps: [parisStdcm, rennesStdcm],
        speedLimitByTag: 'new-tag',
      })
    );

    const state = store.getState()[stdcmConfSlice.name];
    expect(state.rollingStockID).toBe(20);
    expect(state.stdcmPathSteps).toEqual([parisStdcm, rennesStdcm]);
    expect(state.speedLimitByTag).toBe('new-tag');
  });

  describe('Consist updates', () => {
    const store = createStore();
    it('should handle totalMass', () => {
      store.dispatch(stdcmConfSliceActions.updateTotalMass(345));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.totalMass).toEqual(345);
    });

    it('should handle totalLength', () => {
      store.dispatch(stdcmConfSliceActions.updateTotalLength(345));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.totalLength).toEqual(345);
    });
    it('should handle maxSpeed', () => {
      store.dispatch(stdcmConfSliceActions.updateMaxSpeed(110));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.maxSpeed).toEqual(110);
    });
    it('should handle towedRollingStockID', () => {
      store.dispatch(stdcmConfSliceActions.updateTowedRollingStockID(11));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.towedRollingStockID).toEqual(11);
    });
  });

  describe('StdcmPathStep updates', () => {
    const store = createStore(initialStateSTDCMConfig);

    it('should handle origin update', () => {
      const origin = store.getState()[stdcmConfSlice.name].stdcmPathSteps.at(0)!;
      expect(origin.isVia).toBe(false);
      const updates = {
        arrivalType: ArrivalTimeTypes.ASAP,
        arrival: new Date('2024-08-12T15:45:00.000+02:00'),
        tolerances: {
          before: 60,
          after: 60,
        },
      };

      store.dispatch(stdcmConfSliceActions.updateStdcmPathStep({ id: origin.id, updates }));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.stdcmPathSteps.at(0)).toEqual({ ...origin, ...updates });
    });

    it('should handle via update', () => {
      const via = store.getState()[stdcmConfSlice.name].stdcmPathSteps.at(1)!;
      expect(via.isVia).toBe(true);
      const updates = {
        stopType: StdcmStopTypes.DRIVER_SWITCH,
        stopFor: 1,
      };

      store.dispatch(stdcmConfSliceActions.updateStdcmPathStep({ id: via.id, updates }));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.stdcmPathSteps.at(1)).toEqual({ ...via, ...updates });
    });

    it('should handle destination update', () => {
      const destination = store.getState()[stdcmConfSlice.name].stdcmPathSteps.at(-1)!;
      expect(destination.isVia).toBe(false);
      const updates = {
        arrivalType: ArrivalTimeTypes.ASAP,
        arrival: new Date('2024-08-12T15:45:00.000+02:00'),
        tolerances: {
          before: 60,
          after: 60,
        },
      };

      store.dispatch(stdcmConfSliceActions.updateStdcmPathStep({ id: destination.id, updates }));
      const state = store.getState()[stdcmConfSlice.name];
      expect(state.stdcmPathSteps.at(-1)).toEqual({ ...destination, ...updates });
    });
  });

  testCommonConfReducers(stdcmConfSlice);
});
