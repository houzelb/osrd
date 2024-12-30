import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from 'immer';

import { type StdcmStopTypes } from 'applications/stdcm/types';
import { type InfraStateReducers, buildInfraStateReducers, infraState } from 'reducers/infra';
import type {
  OperationalStudiesConfSlice,
  OperationalStudiesConfSliceActions,
} from 'reducers/osrdconf/operationalStudiesConf';
import type { OperationalStudiesConfSelectors } from 'reducers/osrdconf/operationalStudiesConf/selectors';
import type { StdcmConfSlice, StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import type { OsrdConfState, PathStep } from 'reducers/osrdconf/types';

export const defaultCommonConf: OsrdConfState = {
  projectID: undefined,
  studyID: undefined,
  scenarioID: undefined,
  timetableID: undefined,
  electricalProfileSetId: undefined,
  rollingStockID: undefined,
  powerRestriction: [],
  speedLimitByTag: undefined,
  gridMarginBefore: undefined,
  gridMarginAfter: undefined,
  ...infraState,
  // Corresponds to origin and destination not defined
  pathSteps: [null, null],
};

interface CommonConfReducers<S extends OsrdConfState> extends InfraStateReducers<S> {
  ['updateProjectID']: CaseReducer<S, PayloadAction<S['projectID']>>;
  ['updateStudyID']: CaseReducer<S, PayloadAction<S['studyID']>>;
  ['updateScenarioID']: CaseReducer<S, PayloadAction<S['scenarioID']>>;
  ['updateTimetableID']: CaseReducer<S, PayloadAction<S['timetableID']>>;
  ['updateElectricalProfileSetId']: CaseReducer<S, PayloadAction<S['electricalProfileSetId']>>;
  ['updateRollingStockID']: CaseReducer<S, PayloadAction<S['rollingStockID']>>;
  ['updateSpeedLimitByTag']: CaseReducer<S, PayloadAction<S['speedLimitByTag'] | null>>;
  ['updateViaStopTime']: CaseReducer<
    S,
    PayloadAction<{ via: PathStep; duration: string; stopType?: StdcmStopTypes }>
  >;
  ['updateGridMarginBefore']: CaseReducer<S, PayloadAction<S['gridMarginBefore']>>;
  ['updateGridMarginAfter']: CaseReducer<S, PayloadAction<S['gridMarginAfter']>>;
  ['updatePathSteps']: CaseReducer<S, PayloadAction<S['pathSteps']>>;
  ['replaceItinerary']: CaseReducer<S, PayloadAction<S['pathSteps']>>;
  ['deleteItinerary']: CaseReducer<S>;
}

export function buildCommonConfReducers<S extends OsrdConfState>(): CommonConfReducers<S> {
  return {
    ...buildInfraStateReducers<S>(),
    updateProjectID(state: Draft<S>, action: PayloadAction<S['projectID']>) {
      state.projectID = action.payload;
    },
    updateStudyID(state: Draft<S>, action: PayloadAction<S['studyID']>) {
      state.studyID = action.payload;
    },
    updateScenarioID(state: Draft<S>, action: PayloadAction<S['scenarioID']>) {
      state.scenarioID = action.payload;
    },
    updateTimetableID(state: Draft<S>, action: PayloadAction<S['timetableID']>) {
      state.timetableID = action.payload;
    },
    updateElectricalProfileSetId(
      state: Draft<S>,
      action: PayloadAction<S['electricalProfileSetId']>
    ) {
      state.electricalProfileSetId = action.payload;
    },
    updateRollingStockID(state: Draft<S>, action: PayloadAction<S['rollingStockID']>) {
      state.rollingStockID = action.payload;
    },
    updateSpeedLimitByTag(state: Draft<S>, action: PayloadAction<S['speedLimitByTag'] | null>) {
      state.speedLimitByTag = action.payload === null ? undefined : action.payload;
    },
    // TODO: Change the type of duration to number. It is preferable to keep this value in seconds in the store
    //* to avoid multiple conversions between seconds and ISO8601 format across the front.
    updateViaStopTime(
      state: Draft<S>,
      action: PayloadAction<{ via: PathStep; duration: string; stopType?: StdcmStopTypes }>
    ) {
      const {
        payload: { via, duration, stopType },
      } = action;
      state.pathSteps = state.pathSteps.map((pathStep) => {
        if (pathStep && pathStep.id === via.id) {
          return { ...pathStep, stopFor: duration, stopType };
        }
        return pathStep;
      });
    },
    updateGridMarginBefore(state: Draft<S>, action: PayloadAction<S['gridMarginBefore']>) {
      state.gridMarginBefore = action.payload;
    },
    updateGridMarginAfter(state: Draft<S>, action: PayloadAction<S['gridMarginAfter']>) {
      state.gridMarginAfter = action.payload;
    },
    // update path steps without changing the itinerary (only add vias on the existing pathfinding,
    // add schedules, margins or power restrictions)
    updatePathSteps(state: Draft<S>, action: PayloadAction<S['pathSteps']>) {
      state.pathSteps = action.payload;
    },
    deleteItinerary(state: Draft<S>) {
      state.pathSteps = [null, null];
      state.powerRestriction = [];
    },
    replaceItinerary(state: Draft<S>, action: PayloadAction<S['pathSteps']>) {
      state.pathSteps = action.payload;
      state.powerRestriction = [];
    },
  };
}

export type ConfSlice = StdcmConfSlice | OperationalStudiesConfSlice;

export type ConfSliceActions = StdcmConfSliceActions | OperationalStudiesConfSliceActions;

export type ConfSelectors = StdcmConfSelectors | OperationalStudiesConfSelectors;
