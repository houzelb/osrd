import type { TFunction } from 'i18next';
import { compact } from 'lodash';
import type { Dispatch } from 'redux';

import type {
  PathfindingItem,
  PostTimetableByIdStdcmApiArg,
  TrainScheduleBase,
} from 'common/api/osrdEditoastApi';
import getStepLocation from 'modules/pathfinding/helpers/getStepLocation';
import type { InfraState } from 'reducers/infra';
import { setFailure } from 'reducers/main';
import type { OsrdStdcmConfState, StandardAllowance } from 'reducers/osrdconf/types';
import { dateTimeFormatting } from 'utils/date';
import { kmhToMs, tToKg } from 'utils/physics';
import { ISO8601Duration2sec, sec2ms } from 'utils/timeManipulation';

import createMargin from './createMargin';
import { StdcmStopTypes } from '../types';

type ValidStdcmConfig = {
  rollingStockId: number;
  towedRollingStockID?: number;
  timetableId: number;
  infraId: number;
  rollingStockComfort: TrainScheduleBase['comfort'];
  path: PathfindingItem[];
  speedLimitByTag?: string;
  totalMass?: number;
  totalLength?: number;
  maxSpeed?: number;
  margin?: StandardAllowance;
  gridMarginBefore?: number;
  gridMarginAfter?: number;
  workScheduleGroupId?: number;
  temporarySpeedLimitGroupId?: number;
  electricalProfileSetId?: number;
};

export const checkStdcmConf = (
  dispatch: Dispatch,
  t: TFunction,
  osrdconf: OsrdStdcmConfState & InfraState
): ValidStdcmConfig | null => {
  const {
    stdcmPathSteps: pathSteps,
    timetableID,
    speedLimitByTag,
    rollingStockComfort,
    infraID,
    rollingStockID,
    towedRollingStockID,
    standardStdcmAllowance,
    gridMarginBefore,
    gridMarginAfter,
    searchDatetimeWindow,
    workScheduleGroupId,
    temporarySpeedLimitGroupId,
    electricalProfileSetId,
    totalLength,
    totalMass,
    maxSpeed,
  } = osrdconf;
  let error = false;
  if (pathSteps[0] === null) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.noOrigin'),
      })
    );
  }
  if (pathSteps[pathSteps.length - 1] === null) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.noDestination'),
      })
    );
  }
  if (!rollingStockID) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.noRollingStock'),
      })
    );
  }
  if (!infraID) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.noName'),
      })
    );
  }
  if (!timetableID) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.noTimetable'),
      })
    );
  }

  const origin = pathSteps.at(0);
  const destination = pathSteps.at(-1);

  const originArrival = origin?.arrival;
  const destinationArrival = destination?.arrival;
  const isDepartureScheduled = origin?.arrivalType === 'preciseTime';

  const startDateTime = isDepartureScheduled
    ? new Date(originArrival!)
    : new Date(destinationArrival!);

  if (
    searchDatetimeWindow &&
    startDateTime &&
    (startDateTime < searchDatetimeWindow.begin || searchDatetimeWindow.end < startDateTime)
  ) {
    error = true;
    dispatch(
      setFailure({
        name: t('operationalStudies/manageTrainSchedule:errorMessages.trainScheduleTitle'),
        message: t('operationalStudies/manageTrainSchedule:errorMessages.originTimeOutsideWindow', {
          low: dateTimeFormatting(searchDatetimeWindow.begin, false),
          high: dateTimeFormatting(searchDatetimeWindow.end, false),
        }),
      })
    );
  }

  if (error) return null;

  const path = compact(osrdconf.stdcmPathSteps).map((step) => {
    const { arrival, tolerances, stopFor, arrivalType } = step;
    const location = getStepLocation(step);

    let timingData: PathfindingItem['timing_data'] | undefined;
    let duration: number | undefined;
    if (step.isVia) {
      if (step.stopType !== StdcmStopTypes.PASSAGE_TIME) {
        duration = stopFor ? sec2ms(ISO8601Duration2sec(stopFor) || Number(stopFor)) : 0;
      }
    } else {
      // if the step is either the origin or the destination,
      // it must have a duration
      duration = 0;
      if (arrivalType === 'preciseTime' && arrival) {
        timingData = {
          arrival_time: arrival,
          arrival_time_tolerance_before: sec2ms(tolerances?.before ?? 0),
          arrival_time_tolerance_after: sec2ms(tolerances?.after ?? 0),
        };
      }
    }

    return {
      duration,
      location,
      timing_data: timingData,
    };
  });

  return {
    infraId: infraID!,
    rollingStockId: rollingStockID!,
    timetableId: timetableID!,
    rollingStockComfort,
    path,
    speedLimitByTag,
    totalMass,
    totalLength,
    maxSpeed,
    towedRollingStockID,
    margin: standardStdcmAllowance,
    gridMarginBefore,
    gridMarginAfter,
    workScheduleGroupId,
    temporarySpeedLimitGroupId,
    electricalProfileSetId,
  };
};

const toMsOrUndefined = (value: number | undefined): number | undefined =>
  value ? sec2ms(value) : undefined;

export const formatStdcmPayload = (
  validConfig: ValidStdcmConfig
): PostTimetableByIdStdcmApiArg => ({
  infra: validConfig.infraId,
  id: validConfig.timetableId,
  body: {
    comfort: validConfig.rollingStockComfort || 'STANDARD',
    margin: createMargin(validConfig.margin),
    rolling_stock_id: validConfig.rollingStockId,
    towed_rolling_stock_id: validConfig.towedRollingStockID,
    speed_limit_tags: validConfig.speedLimitByTag,
    total_mass: validConfig.totalMass ? tToKg(validConfig.totalMass) : undefined,
    max_speed: validConfig.maxSpeed ? kmhToMs(validConfig.maxSpeed) : undefined,
    total_length: validConfig.totalLength,
    steps: validConfig.path,
    time_gap_after: toMsOrUndefined(validConfig.gridMarginBefore),
    time_gap_before: toMsOrUndefined(validConfig.gridMarginAfter),
    work_schedule_group_id: validConfig.workScheduleGroupId,
    temporary_speed_limit_group_id: validConfig.temporarySpeedLimitGroupId,
    electrical_profile_set_id: validConfig.electricalProfileSetId,
    loading_gauge_type: 'GA', // default value as the user can't select one
  },
});
