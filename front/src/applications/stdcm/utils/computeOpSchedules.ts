import { extractDateAndTime, addDurationToDate, subtractDurationFromDate } from 'utils/date';

/**
 * Computes the operation schedules for a given start time and duration.
 *
 * @param startTime - The ISO string representing the start time.
 * @param msFromStartTime - The duration in milliseconds from the start time.
 * @returns An object containing the origin and destination schedules.
 *
 * The function extracts the date and time from the provided ISO start time and calculates the destination arrival time
 * by adding the specified duration. It then returns an object with the origin and destination schedules, including
 * the date, time, and ISO arrival times.
 *
 * Note: A margin of 1800 seconds (30 minutes) is applied to the departure and arrival times to allow for necessary
 * activities such as preparation for the next departure.
 */
const computeOpSchedules = (startTime: Date, msFromStartTime: number) => {
  const { arrivalDate: originDate, arrivalTime: originTime } = extractDateAndTime(
    startTime,
    'DD/MM/YY'
  );
  const destinationArrivalTime = addDurationToDate(startTime, msFromStartTime, 'millisecond');
  const { arrivalDate: destinationDate, arrivalTime: destinationTime } = extractDateAndTime(
    destinationArrivalTime,
    'DD/MM/YY'
  );

  return {
    origin: {
      date: originDate,
      time: originTime,
      isoArrivalTime: subtractDurationFromDate(startTime, 1800).toISOString(),
    },
    destination: {
      date: destinationDate,
      time: destinationTime,
      isoArrivalTime: addDurationToDate(destinationArrivalTime, 1800).toISOString(),
    },
  };
};

export default computeOpSchedules;
