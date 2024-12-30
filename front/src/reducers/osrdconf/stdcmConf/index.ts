import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from 'immer';
import nextId from 'react-id-generator';

import {
  ArrivalTimeTypes,
  StdcmStopTypes,
  type ExtremityPathStepType,
  type StdcmLinkedTrainExtremity,
} from 'applications/stdcm/types';
import { defaultCommonConf, buildCommonConfReducers } from 'reducers/osrdconf/osrdConfCommon';
import type { OsrdStdcmConfState, StdcmPathStep } from 'reducers/osrdconf/types';
import { addElementAtIndex } from 'utils/array';
import type { ArrayElement } from 'utils/types';

const DEFAULT_TOLERANCE = 1800; // 30min

export const stdcmConfInitialState: OsrdStdcmConfState = {
  stdcmPathSteps: [
    {
      id: nextId(),
      isVia: false,
      arrivalType: ArrivalTimeTypes.PRECISE_TIME,
      tolerances: { before: DEFAULT_TOLERANCE, after: DEFAULT_TOLERANCE },
    },
    {
      id: nextId(),
      isVia: false,
      arrivalType: ArrivalTimeTypes.ASAP,
      tolerances: { before: DEFAULT_TOLERANCE, after: DEFAULT_TOLERANCE },
    },
  ],
  margins: {
    standardAllowance: undefined,
    gridMarginBefore: undefined,
    gridMarginAfter: undefined,
  },
  totalMass: undefined,
  totalLength: undefined,
  maxSpeed: undefined,
  towedRollingStockID: undefined,
  linkedTrains: {
    anteriorTrain: undefined,
    posteriorTrain: undefined,
  },
  ...defaultCommonConf,
};

export const stdcmConfSlice = createSlice({
  name: 'stdcmConf',
  initialState: stdcmConfInitialState,
  reducers: {
    ...buildCommonConfReducers<OsrdStdcmConfState>(),
    resetStdcmConfig(state: Draft<OsrdStdcmConfState>) {
      state.rollingStockID = stdcmConfInitialState.rollingStockID;
      state.stdcmPathSteps = stdcmConfInitialState.stdcmPathSteps;
      state.towedRollingStockID = stdcmConfInitialState.towedRollingStockID;
      state.totalLength = stdcmConfInitialState.totalLength;
      state.totalMass = stdcmConfInitialState.totalMass;
      state.maxSpeed = stdcmConfInitialState.maxSpeed;
      state.speedLimitByTag = stdcmConfInitialState.speedLimitByTag;
    },
    updateTotalMass(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['totalMass']>
    ) {
      state.totalMass = action.payload;
    },
    updateTotalLength(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['totalLength']>
    ) {
      state.totalLength = action.payload;
    },
    updateMaxSpeed(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['maxSpeed']>
    ) {
      state.maxSpeed = action.payload;
    },
    updateTowedRollingStockID(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['towedRollingStockID']>
    ) {
      state.towedRollingStockID = action.payload;
    },
    updateStdcmConfigWithData(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<
        Pick<
          OsrdStdcmConfState,
          | 'rollingStockID'
          | 'towedRollingStockID'
          | 'stdcmPathSteps'
          | 'speedLimitByTag'
          | 'totalLength'
          | 'totalMass'
          | 'maxSpeed'
        >
      >
    ) {
      state.rollingStockID = action.payload.rollingStockID;
      state.towedRollingStockID = action.payload.towedRollingStockID;
      state.totalLength = action.payload.totalLength;
      state.totalMass = action.payload.totalMass;
      state.maxSpeed = action.payload.maxSpeed;
      state.stdcmPathSteps = action.payload.stdcmPathSteps;
      state.speedLimitByTag = action.payload.speedLimitByTag;
    },
    updateStandardAllowance(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['margins']['standardAllowance']>
    ) {
      state.margins = { ...state.margins, standardAllowance: action.payload };
    },
    updateGridMarginBefore(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['margins']['gridMarginBefore']>
    ) {
      state.margins = { ...state.margins, gridMarginBefore: action.payload };
    },
    updateGridMarginAfter(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['margins']['gridMarginAfter']>
    ) {
      state.margins = { ...state.margins, gridMarginAfter: action.payload };
    },
    updateStdcmEnvironment(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<
        Pick<
          OsrdStdcmConfState,
          | 'infraID'
          | 'timetableID'
          | 'electricalProfileSetId'
          | 'workScheduleGroupId'
          | 'temporarySpeedLimitGroupId'
          | 'searchDatetimeWindow'
        >
      >
    ) {
      state.infraID = action.payload.infraID;
      state.timetableID = action.payload.timetableID;
      state.electricalProfileSetId = action.payload.electricalProfileSetId;
      state.searchDatetimeWindow = action.payload.searchDatetimeWindow;
      if (action.payload.workScheduleGroupId) {
        state.workScheduleGroupId = action.payload.workScheduleGroupId;
      }
      if (action.payload.temporarySpeedLimitGroupId) {
        state.temporarySpeedLimitGroupId = action.payload.temporarySpeedLimitGroupId;
      }
    },
    updateStdcmPathSteps(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<OsrdStdcmConfState['stdcmPathSteps']>
    ) {
      state.stdcmPathSteps = action.payload;
    },
    updateStdcmPathStep(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<{
        id: string;
        updates: Partial<ArrayElement<OsrdStdcmConfState['stdcmPathSteps']>>;
      }>
    ) {
      const newPathSteps = state.stdcmPathSteps.map((pathStep) =>
        pathStep.id === action.payload.id
          ? ({ ...pathStep, ...action.payload.updates } as StdcmPathStep)
          : pathStep
      );
      state.stdcmPathSteps = newPathSteps;
    },
    addStdcmVia(state: Draft<OsrdStdcmConfState>, action: PayloadAction<number>) {
      // Index takes count of the origin in the array
      state.stdcmPathSteps = addElementAtIndex(state.stdcmPathSteps, action.payload, {
        id: nextId(),
        stopType: StdcmStopTypes.PASSAGE_TIME,
        isVia: true,
      });
    },
    deleteStdcmVia(state: Draft<OsrdStdcmConfState>, action: PayloadAction<string>) {
      state.stdcmPathSteps = state.stdcmPathSteps.filter(
        (pathStep) => pathStep.id !== action.payload
      );
    },
    updateLinkedTrainExtremity(
      state: Draft<OsrdStdcmConfState>,
      action: PayloadAction<{
        linkedTrainExtremity: ExtremityPathStepType;
        trainName: string;
        pathStep: StdcmLinkedTrainExtremity;
        pathStepId: string;
      }>
    ) {
      const { linkedTrainExtremity, trainName, pathStep, pathStepId } = action.payload;
      const { name, ch, uic, geographic, isoArrivalTime, date, time } = pathStep;
      const newPathStep = {
        name,
        ch,
        id: pathStepId,
        uic,
        coordinates: geographic.coordinates,
        arrival: isoArrivalTime,
        ...(linkedTrainExtremity === 'origin' && { arrivalType: ArrivalTimeTypes.PRECISE_TIME }),
      };

      const newLinkedTrain = { date, time, trainName };

      if (linkedTrainExtremity === 'destination') {
        state.linkedTrains.anteriorTrain = newLinkedTrain;
      } else {
        state.linkedTrains.posteriorTrain = newLinkedTrain;
      }
      const newPathSteps = state.stdcmPathSteps.map((step) =>
        step.id === action.payload.pathStepId
          ? ({ ...step, ...newPathStep } as StdcmPathStep)
          : step
      );
      state.stdcmPathSteps = newPathSteps;
    },
  },
});

export const stdcmConfSliceActions = stdcmConfSlice.actions;

export const { updateGridMarginAfter, updateGridMarginBefore, updateStandardAllowance } =
  stdcmConfSliceActions;

export type StdcmConfSlice = typeof stdcmConfSlice;

export type StdcmConfSliceActions = typeof stdcmConfSliceActions;

export default stdcmConfSlice.reducer;
