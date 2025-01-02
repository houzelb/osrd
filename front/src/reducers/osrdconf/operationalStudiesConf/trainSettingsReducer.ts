import type { PayloadAction } from '@reduxjs/toolkit';
import type { Draft } from 'immer';

import type { OperationalStudiesConfState } from '.';

const buildTrainSettingsReducer = () => ({
  updateConstraintDistribution(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['constraintDistribution']>
  ) {
    state.constraintDistribution = action.payload;
  },
  updateName(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['name']>
  ) {
    state.name = action.payload;
  },
  updateTrainCount(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['trainCount']>
  ) {
    state.trainCount = action.payload;
  },
  updateTrainDelta(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['trainDelta']>
  ) {
    state.trainDelta = action.payload;
  },
  updateTrainStep(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['trainStep']>
  ) {
    state.trainStep = action.payload;
  },
  toggleUsingElectricalProfiles(state: Draft<OperationalStudiesConfState>) {
    state.usingElectricalProfiles = !state.usingElectricalProfiles;
  },
  updateLabels(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['labels']>
  ) {
    state.labels = action.payload;
  },
  updateInitialSpeed(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['initialSpeed']>
  ) {
    state.initialSpeed = action.payload;
  },
  updateStartTime(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['startTime']>
  ) {
    state.startTime = action.payload;
  },
  updateRollingStockComfort(
    state: Draft<OperationalStudiesConfState>,
    action: PayloadAction<OperationalStudiesConfState['rollingStockComfort']>
  ) {
    state.rollingStockComfort = action.payload;
  },
});

export default buildTrainSettingsReducer;
