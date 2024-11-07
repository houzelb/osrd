/* eslint-disable import/prefer-default-export */
import { dateToHHMMSS } from 'utils/date';
import { ISO8601Duration2sec } from 'utils/timeManipulation';

import type { ScheduleEntry } from '../types';
import { receptionSignalToSignalBooleans } from './utils';

/** Format the stopFor, calculatedDeparture, shortSlipDistance and onStopSignal properties */
export const formatSchedule = (arrivalTime: Date, schedule?: ScheduleEntry) => {
  if (!schedule) {
    return {
      stopFor: undefined,
      calculatedDeparture: undefined,
      shortSlipDistance: false,
      onStopSignal: false,
    };
  }

  if (!schedule.stop_for) {
    return {
      stopFor: undefined,
      calculatedDeparture: undefined,
      ...receptionSignalToSignalBooleans(schedule.reception_signal),
    };
  }

  const stopForSeconds = ISO8601Duration2sec(schedule.stop_for);

  return {
    stopFor: `${stopForSeconds}`,
    calculatedDeparture: dateToHHMMSS(new Date(arrivalTime.getTime() + stopForSeconds * 1000)),
    ...receptionSignalToSignalBooleans(schedule.reception_signal),
  };
};
