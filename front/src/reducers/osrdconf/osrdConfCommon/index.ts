import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from 'immer';
import { omit } from 'lodash';

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
  constraintDistribution: 'MARECO',
  name: '',
  trainCount: 1,
  trainDelta: 15,
  trainStep: 2,
  usingElectricalProfiles: true,
  labels: [],
  projectID: undefined,
  studyID: undefined,
  scenarioID: undefined,
  timetableID: undefined,
  electricalProfileSetId: undefined,
  rollingStockID: undefined,
  powerRestriction: [],
  speedLimitByTag: undefined,
  initialSpeed: 0,
  gridMarginBefore: undefined,
  gridMarginAfter: undefined,
  ...infraState,
  featureInfoClick: { displayPopup: false },
  // Corresponds to origin and destination not defined
  pathSteps: [null, null],
  rollingStockComfort: 'STANDARD' as const,
  startTime: new Date(),
};

interface CommonConfReducers<S extends OsrdConfState> extends InfraStateReducers<S> {
  ['updateConstraintDistribution']: CaseReducer<S, PayloadAction<S['constraintDistribution']>>;
  ['updateName']: CaseReducer<S, PayloadAction<S['name']>>;
  ['updateTrainCount']: CaseReducer<S, PayloadAction<S['trainCount']>>;
  ['updateTrainDelta']: CaseReducer<S, PayloadAction<OsrdConfState['trainDelta']>>;
  ['updateTrainStep']: CaseReducer<S, PayloadAction<S['trainStep']>>;
  ['toggleUsingElectricalProfiles']: CaseReducer<S>;
  ['updateLabels']: CaseReducer<S, PayloadAction<S['labels']>>;
  ['updateProjectID']: CaseReducer<S, PayloadAction<S['projectID']>>;
  ['updateStudyID']: CaseReducer<S, PayloadAction<S['studyID']>>;
  ['updateScenarioID']: CaseReducer<S, PayloadAction<S['scenarioID']>>;
  ['updateTimetableID']: CaseReducer<S, PayloadAction<S['timetableID']>>;
  ['updateElectricalProfileSetId']: CaseReducer<S, PayloadAction<S['electricalProfileSetId']>>;
  ['updateRollingStockID']: CaseReducer<S, PayloadAction<S['rollingStockID']>>;
  ['updateSpeedLimitByTag']: CaseReducer<S, PayloadAction<S['speedLimitByTag'] | null>>;
  ['updateInitialSpeed']: CaseReducer<S, PayloadAction<S['initialSpeed']>>;
  ['updateViaStopTime']: CaseReducer<
    S,
    PayloadAction<{ via: PathStep; duration: string; stopType?: StdcmStopTypes }>
  >;
  ['updateGridMarginBefore']: CaseReducer<S, PayloadAction<S['gridMarginBefore']>>;
  ['updateGridMarginAfter']: CaseReducer<S, PayloadAction<S['gridMarginAfter']>>;
  ['updateFeatureInfoClick']: CaseReducer<S, PayloadAction<S['featureInfoClick']>>;
  ['updatePathSteps']: CaseReducer<S, PayloadAction<S['pathSteps']>>;
  ['replaceItinerary']: CaseReducer<S, PayloadAction<S['pathSteps']>>;
  ['deleteItinerary']: CaseReducer<S>;
  ['updateRollingStockComfort']: CaseReducer<S, PayloadAction<S['rollingStockComfort']>>;
  ['updateStartTime']: CaseReducer<S, PayloadAction<S['startTime']>>;
}

export function buildCommonConfReducers<S extends OsrdConfState>(): CommonConfReducers<S> {
  return {
    ...buildInfraStateReducers<S>(),
    updateConstraintDistribution(
      state: Draft<S>,
      action: PayloadAction<S['constraintDistribution']>
    ) {
      state.constraintDistribution = action.payload;
    },
    updateName(state: Draft<S>, action: PayloadAction<S['name']>) {
      state.name = action.payload;
    },
    updateTrainCount(state: Draft<S>, action: PayloadAction<S['trainCount']>) {
      state.trainCount = action.payload;
    },
    updateTrainDelta(state: Draft<S>, action: PayloadAction<OsrdConfState['trainDelta']>) {
      state.trainDelta = action.payload;
    },
    updateTrainStep(state: Draft<S>, action: PayloadAction<S['trainStep']>) {
      state.trainStep = action.payload;
    },
    toggleUsingElectricalProfiles(state: Draft<S>) {
      state.usingElectricalProfiles = !state.usingElectricalProfiles;
    },
    updateLabels(state: Draft<S>, action: PayloadAction<S['labels']>) {
      state.labels = action.payload;
    },
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
    updateInitialSpeed(state: Draft<S>, action: PayloadAction<S['initialSpeed']>) {
      state.initialSpeed = action.payload;
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
    updateFeatureInfoClick(state: Draft<S>, action: PayloadAction<S['featureInfoClick']>) {
      const feature = omit(action.payload.feature, ['_vectorTileFeature']);
      state.featureInfoClick = { ...action.payload, feature };
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
    updateRollingStockComfort(state: Draft<S>, action: PayloadAction<S['rollingStockComfort']>) {
      state.rollingStockComfort = action.payload;
    },
    updateStartTime(state: Draft<S>, action: PayloadAction<S['startTime']>) {
      state.startTime = action.payload;
    },
  };
}

export type ConfSlice = StdcmConfSlice | OperationalStudiesConfSlice;

export type ConfSliceActions = StdcmConfSliceActions | OperationalStudiesConfSliceActions;

export type ConfSelectors = StdcmConfSelectors | OperationalStudiesConfSelectors;
