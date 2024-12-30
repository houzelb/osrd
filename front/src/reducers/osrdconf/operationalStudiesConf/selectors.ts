import type { RootState } from 'reducers';
import {
  operationalStudiesConfSlice,
  type OperationalStudiesConfState,
} from 'reducers/osrdconf/operationalStudiesConf';
import buildCommonConfSelectors from 'reducers/osrdconf/osrdConfCommon/selectors';
import { makeSubSelector } from 'utils/selectors';

const buildOperationalStudiesConfSelectors = () => {
  const commonConfSelectors = buildCommonConfSelectors(operationalStudiesConfSlice);

  const getOperationalStudiesConf = (state: RootState) => state[operationalStudiesConfSlice.name];
  const makeOsrdConfSelector =
    makeSubSelector<OperationalStudiesConfState>(getOperationalStudiesConf);

  return {
    ...commonConfSelectors,
    getOperationalStudiesConf,

    getName: makeOsrdConfSelector('name'),
    getStartTime: makeOsrdConfSelector('startTime'),
    getInitialSpeed: makeOsrdConfSelector('initialSpeed'),
    getLabels: makeOsrdConfSelector('labels'),

    getRollingStockComfort: makeOsrdConfSelector('rollingStockComfort'),
    getConstraintDistribution: makeOsrdConfSelector('constraintDistribution'),
    getUsingElectricalProfiles: makeOsrdConfSelector('usingElectricalProfiles'),

    getTrainCount: makeOsrdConfSelector('trainCount'),
    getTrainDelta: makeOsrdConfSelector('trainDelta'),
    getTrainStep: makeOsrdConfSelector('trainStep'),
  };
};

const selectors = buildOperationalStudiesConfSelectors();

export const {
  getOperationalStudiesConf,
  getName,
  getStartTime,
  getInitialSpeed,
  getLabels,
  getRollingStockComfort,
  getConstraintDistribution,
  getUsingElectricalProfiles,
  getTrainCount,
  getTrainDelta,
  getTrainStep,
} = selectors;

export type OperationalStudiesConfSelectors = typeof selectors;

export default selectors;
