import type { RootState } from 'reducers';
import { operationalStudiesConfSlice } from 'reducers/osrdconf/operationalStudiesConf';
import buildCommonConfSelectors from 'reducers/osrdconf/osrdConfCommon/selectors';

const buildOperationalStudiesConfSelectors = () => {
  const commonConfSelectors = buildCommonConfSelectors(operationalStudiesConfSlice);
  const getOperationalStudiesConf = (state: RootState) => state[operationalStudiesConfSlice.name];

  return {
    ...commonConfSelectors,
    getOperationalStudiesConf,
  };
};

const selectors = buildOperationalStudiesConfSelectors();

export const { getOperationalStudiesConf } = selectors;

export type OperationalStudiesConfSelectors = typeof selectors;

export default selectors;
