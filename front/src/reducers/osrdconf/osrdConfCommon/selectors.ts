import { compact } from 'lodash';
import { createSelector } from 'reselect';

import type { RootState } from 'reducers';
import buildInfraStateSelectors from 'reducers/infra/selectors';
import type { OperationalStudiesConfSlice } from 'reducers/osrdconf/operationalStudiesConf';
import type { StdcmConfSlice } from 'reducers/osrdconf/stdcmConf';
import { makeSubSelector } from 'utils/selectors';

const buildCommonConfSelectors = (slice: OperationalStudiesConfSlice | StdcmConfSlice) => {
  const makeOsrdConfSelector = makeSubSelector((state: RootState) => state[slice.name]);

  const getPathSteps = makeOsrdConfSelector('pathSteps');

  // If createSelector is not used and we return directly : pathSteps.slice(1, -1), we get this rtk warning :
  // Selector getVias returned a different result when called with the same parameters. This can lead to unnecessary rerenders.
  // Selectors that return a new reference (such as an object or an array) should be memoized: https://redux.js.org/usage/deriving-data-selectors#optimizing-selectors-with-memoization
  const viasSelector = createSelector(
    getPathSteps,
    (pathSteps) => compact(pathSteps.slice(1, -1)) // a via can't be null
  );

  return {
    ...buildInfraStateSelectors(slice),
    getProjectID: makeOsrdConfSelector('projectID'),
    getStudyID: makeOsrdConfSelector('studyID'),
    getScenarioID: makeOsrdConfSelector('scenarioID'),
    getTimetableID: makeOsrdConfSelector('timetableID'),
    getElectricalProfileSetId: makeOsrdConfSelector('electricalProfileSetId'),
    getWorkScheduleGroupId: makeOsrdConfSelector('workScheduleGroupId'),
    getSearchDatetimeWindow: makeOsrdConfSelector('searchDatetimeWindow'),
    getRollingStockID: makeOsrdConfSelector('rollingStockID'),
    getSpeedLimitByTag: makeOsrdConfSelector('speedLimitByTag'),
    getPowerRestriction: makeOsrdConfSelector('powerRestriction'),
    getPathSteps,
    getOrigin: (state: RootState) => {
      const pathSteps = getPathSteps(state);
      return pathSteps[0];
    },
    getDestination: (state: RootState) => {
      const pathSteps = getPathSteps(state);
      return pathSteps[pathSteps.length - 1];
    },
    /** To use this action, do useSelector(getVias()) */
    getVias: () => viasSelector,
  };
};

export default buildCommonConfSelectors;
