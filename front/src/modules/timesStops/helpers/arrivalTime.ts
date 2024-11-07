/* eslint-disable import/prefer-default-export */
import { dateToHHMMSS } from 'utils/date';
import { ISO8601Duration2sec, calculateTimeDifferenceInDays } from 'utils/timeManipulation';

import type { ScheduleEntry, TimeExtraDays } from '../types';

const computeDayTimeFromStartTime = (
  startDatetime: Date,
  duration: number, // seconds
  previousDatetime: Date
): { timeExtraDay: TimeExtraDays; previousTime: Date } => {
  const arrivalDatetime = new Date(startDatetime.getTime() + duration * 1000);

  const isAfterMidnight = arrivalDatetime.getDate() !== previousDatetime.getDate();

  const timeExtraDay = {
    time: dateToHHMMSS(arrivalDatetime),
    daySinceDeparture: calculateTimeDifferenceInDays(startDatetime, arrivalDatetime),
    dayDisplayed: isAfterMidnight,
  };

  return { timeExtraDay, previousTime: arrivalDatetime };
};

export const computeInputDatetimes = (
  startDatetime: Date,
  lastReferenceDate: Date,
  schedule: ScheduleEntry | undefined,
  { isDeparture }: { isDeparture: boolean }
) => {
  let theoreticalArrival: Date | undefined;
  let arrival: TimeExtraDays | undefined;
  let departure: TimeExtraDays | undefined;
  let refDate = lastReferenceDate;

  let arrivalInSeconds;
  // if is departure, use the startDatetime
  if (isDeparture) {
    arrivalInSeconds = 0;
  } else if (schedule?.arrival) {
    arrivalInSeconds = ISO8601Duration2sec(schedule.arrival); // duration from startTime
  }

  if (arrivalInSeconds !== undefined) {
    theoreticalArrival = new Date(startDatetime.getTime() + arrivalInSeconds * 1000);
    const { timeExtraDay, previousTime } = computeDayTimeFromStartTime(
      startDatetime,
      arrivalInSeconds,
      refDate
    );
    arrival = timeExtraDay;
    refDate = previousTime;

    if (schedule?.stop_for) {
      const departureInSeconds = arrivalInSeconds + ISO8601Duration2sec(schedule.stop_for);
      const resultDeparture = computeDayTimeFromStartTime(
        startDatetime,
        departureInSeconds,
        refDate
      );
      departure = resultDeparture.timeExtraDay;
      refDate = resultDeparture.previousTime;
    }
  }

  return { theoreticalArrival, arrival, departure, refDate };
};
