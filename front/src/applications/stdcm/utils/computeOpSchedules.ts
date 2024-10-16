import {
  extractDateAndTimefromISO,
  addDurationToIsoDate,
  substractDurationToIsoDate,
} from 'utils/date';

const computeOpSchedules = (startTime: string, secondsFromStartTime: string) => {
  const { arrivalDate: originDate, arrivalTime: originTime } = extractDateAndTimefromISO(
    startTime,
    'DD/MM/YY'
  );
  const destinationArrivalTime = addDurationToIsoDate(startTime, secondsFromStartTime);
  const { arrivalDate: destinationDate, arrivalTime: destinationTime } = extractDateAndTimefromISO(
    destinationArrivalTime,
    'DD/MM/YY'
  );

  return {
    origin: {
      date: originDate,
      time: originTime,
      isoArrivalTime: substractDurationToIsoDate(startTime, 'PT1800S'),
    },
    destination: {
      date: destinationDate,
      time: destinationTime,
      isoArrivalTime: addDurationToIsoDate(destinationArrivalTime, 'PT1800S'),
    },
  };
};

export default computeOpSchedules;
