import {
  extractDateAndTimefromISO,
  addDurationToIsoDate,
  substractDurationToIsoDate,
} from 'utils/date';

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
const computeOpSchedules = (startTime: string, msFromStartTime: number) => {
  const { arrivalDate: originDate, arrivalTime: originTime } = extractDateAndTimefromISO(
    startTime,
    'DD/MM/YY'
  );
  const destinationArrivalTime = addDurationToIsoDate(startTime, msFromStartTime, 'millisecond');
  const { arrivalDate: destinationDate, arrivalTime: destinationTime } = extractDateAndTimefromISO(
    destinationArrivalTime,
    'DD/MM/YY'
  );

  return {
    origin: {
      date: originDate,
      time: originTime,
      isoArrivalTime: substractDurationToIsoDate(startTime, 1800),
    },
    destination: {
      date: destinationDate,
      time: destinationTime,
      isoArrivalTime: addDurationToIsoDate(destinationArrivalTime, 1800),
    },
  };
};

export default computeOpSchedules;
