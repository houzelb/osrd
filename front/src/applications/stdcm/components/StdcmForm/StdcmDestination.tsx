import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getTimesInfoFromDate } from 'applications/stdcm/utils';
import DestinationIcon from 'assets/pictures/mapMarkers/destination.svg';
import { useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';

import StdcmCard from './StdcmCard';
import StdcmOperationalPoint from './StdcmOperationalPoint';
import StdcmOpSchedule from './StdcmOpSchedule';
import type { StdcmConfigCardProps } from '../../types';

const StdcmDestination = ({ disabled = false }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');

  const { getStdcmDestination } = useOsrdConfSelectors() as StdcmConfSelectors;

  const destination = useSelector(getStdcmDestination);

  const { destinationArrival, destinationToleranceValues } = useMemo(
    () => ({
      destinationArrival: getTimesInfoFromDate(destination.arrival),
      destinationToleranceValues: {
        arrivalToleranceBefore: destination.tolerances?.before || 0,
        arrivalToleranceAfter: destination.tolerances?.after || 0,
      },
    }),
    [destination]
  );

  return (
    <StdcmCard
      data-testid="destination-card"
      name={t('trainPath.destination')}
      title={<img src={DestinationIcon} alt="destination" className="stdcm-destination-icon" />}
      disabled={disabled}
      className="extremity"
    >
      <StdcmOperationalPoint
        location={destination.location}
        pathStepId={destination.id}
        disabled={disabled}
      />
      <StdcmOpSchedule
        pathStep={destination}
        opTimingData={destinationArrival}
        opToleranceValues={destinationToleranceValues}
        opScheduleTimeType={destination.arrivalType}
        disabled={disabled}
        opId="destination-arrival"
      />
    </StdcmCard>
  );
};

export default StdcmDestination;
