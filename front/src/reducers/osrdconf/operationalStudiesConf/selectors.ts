import {
  operationalStudiesConfSlice,
  type OperationalStudiesConfState,
} from 'reducers/osrdconf/operationalStudiesConf';
import buildCommonConfSelectors from 'reducers/osrdconf/osrdConfCommon/selectors';

const buildOperationalStudiesConfSelectors = () => {
  const commonConfSelectors = buildCommonConfSelectors<OperationalStudiesConfState>(
    operationalStudiesConfSlice
  );
  return {
    ...commonConfSelectors,
  };
};

const selectors = buildOperationalStudiesConfSelectors();

export type OperationalStudiesConfSelectors = typeof selectors;

export default selectors;
