import { createSlice, type Draft, type PayloadAction } from '@reduxjs/toolkit';

import type { TrainScheduleWithDetails } from 'modules/trainschedule/components/Timetable/types';
import computeBasePathStep from 'modules/trainschedule/helpers/computeBasePathStep';
import { defaultCommonConf, buildCommonConfReducers } from 'reducers/osrdconf/osrdConfCommon';
import type { OsrdConfState } from 'reducers/osrdconf/types';
import { convertIsoUtcToLocalTime } from 'utils/date';
import { msToKmh } from 'utils/physics';

import { builPowerRestrictionReducer } from './powerRestrictionReducer';

export type OperationalStudiesConfState = OsrdConfState;

export const operationalStudiesConfSlice = createSlice({
  name: 'operationalStudiesConf',
  initialState: defaultCommonConf,
  reducers: {
    ...buildCommonConfReducers<OperationalStudiesConfState>(),
    ...builPowerRestrictionReducer<OperationalStudiesConfState>(),
    selectTrainToEdit(
      state: Draft<OperationalStudiesConfState>,
      action: PayloadAction<TrainScheduleWithDetails>
    ) {
      const {
        rollingStock,
        trainName,
        initial_speed,
        start_time,
        options,
        speedLimitTag,
        labels,
        power_restrictions,
        path,
      } = action.payload;

      state.rollingStockID = rollingStock?.id;
      state.pathSteps = path.map((_, index) => computeBasePathStep(action.payload, index));
      state.startTime = convertIsoUtcToLocalTime(start_time);

      state.name = trainName;
      state.initialSpeed = initial_speed ? Math.floor(msToKmh(initial_speed) * 10) / 10 : 0;

      state.usingElectricalProfiles = options?.use_electrical_profiles ?? true;
      state.labels = labels;
      state.speedLimitByTag = speedLimitTag || undefined;
      state.powerRestriction = power_restrictions || [];
    },
  },
});

export const operationalStudiesConfSliceActions = operationalStudiesConfSlice.actions;

export type OperationalStudiesConfSlice = typeof operationalStudiesConfSlice;

export type OperationalStudiesConfSliceActions = typeof operationalStudiesConfSliceActions;

export default operationalStudiesConfSlice.reducer;
