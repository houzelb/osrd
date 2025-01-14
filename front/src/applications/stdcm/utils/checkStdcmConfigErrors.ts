import type { TFunction } from 'i18next';

import type { StdcmPathStep } from 'reducers/osrdconf/types';
import { dateToHHMMSS } from 'utils/date';

import { StdcmConfigErrorTypes, ArrivalTimeTypes, type StdcmConfigErrors } from '../types';

const checkStdcmConfigErrors = (
  pathfindingStateError: boolean,
  pathSteps: StdcmPathStep[],
  t: TFunction
): StdcmConfigErrors | undefined => {
  if (pathSteps.some((step) => !step.location)) {
    return { errorType: StdcmConfigErrorTypes.MISSING_LOCATION };
  }

  const origin = pathSteps.at(0)!;
  const destination = pathSteps.at(-1)!;
  if (origin.isVia) {
    throw new Error('First step can not be a via');
  }
  if (destination.isVia) {
    throw new Error('Last step can not be a via');
  }

  if (pathfindingStateError) {
    return { errorType: StdcmConfigErrorTypes.PATHFINDING_FAILED };
  }

  const isOriginRespectDestinationSchedule =
    origin.arrivalType === ArrivalTimeTypes.RESPECT_DESTINATION_SCHEDULE;

  if (
    'uic' in origin &&
    'uic' in destination &&
    'ch' in origin &&
    'ch' in destination &&
    origin.uic === destination.uic &&
    origin.ch === destination.ch
  ) {
    return { errorType: StdcmConfigErrorTypes.SAME_ORIGIN_AND_DESTINATION };
  }

  const isDestinationASAP = destination.arrivalType === ArrivalTimeTypes.ASAP;

  const areBothPointsNotSchedule = isOriginRespectDestinationSchedule && isDestinationASAP;

  if (areBothPointsNotSchedule) {
    return { errorType: StdcmConfigErrorTypes.NO_SCHEDULED_POINT };
  }

  const areBothPointsScheduled =
    origin.arrivalType === ArrivalTimeTypes.PRECISE_TIME &&
    destination.arrivalType === ArrivalTimeTypes.PRECISE_TIME;

  if (areBothPointsScheduled) {
    return {
      errorType: StdcmConfigErrorTypes.BOTH_POINT_SCHEDULED,
      errorDetails: {
        originTime: origin?.arrival
          ? t('leaveAt', { time: dateToHHMMSS(origin.arrival, { withoutSeconds: true }) })
          : t('departureTime'),
        destinationTime: destination?.arrival
          ? t('arriveAt', { time: dateToHHMMSS(destination.arrival, { withoutSeconds: true }) })
          : t('destinationTime'),
      },
    };
  }

  const isOnePointScheduledWithoutTime =
    (origin.arrivalType === ArrivalTimeTypes.PRECISE_TIME && !origin.arrival) ||
    (destination.arrivalType === ArrivalTimeTypes.PRECISE_TIME && !destination.arrival);

  if (isOnePointScheduledWithoutTime) {
    return { errorType: StdcmConfigErrorTypes.NO_SCHEDULED_POINT };
  }
  return undefined;
};

export default checkStdcmConfigErrors;
