import type { MarkerInformation } from 'modules/trainschedule/components/ManageTrainSchedule/ManageTrainScheduleMap/ItineraryMarkers';
import type { StdcmPathStep } from 'reducers/osrdconf/types';
import { dateToHHMMSS, dateToDDMMYYYY } from 'utils/date';

export const getTimesInfoFromDate = (date?: Date) =>
  date
    ? {
        date,
        arrivalDate: dateToDDMMYYYY(date), // ISO date part
        arrivalTime: dateToHHMMSS(date, { withoutSeconds: true }),
        arrivalTimeHours: date.getHours(),
        arrivalTimeMinutes: date.getMinutes(),
      }
    : undefined;

export const extractMarkersInfo = (pathSteps: StdcmPathStep[]) =>
  pathSteps.reduce((acc, step) => {
    if (step.location) {
      acc.push({
        coordinates: step.location.coordinates,
        name: step.location.name,
      });
    }
    return acc;
  }, [] as MarkerInformation[]);
