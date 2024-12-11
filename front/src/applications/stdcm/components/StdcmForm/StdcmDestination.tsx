import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import DestinationIcon from 'assets/pictures/mapMarkers/destination.svg';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import { useAppDispatch } from 'store';
import { extractDateAndTimefromISO, generateISODateFromDateTime } from 'utils/date';

import StdcmCard from './StdcmCard';
import StdcmOperationalPoint from './StdcmOperationalPoint';
import StdcmOpSchedule from './StdcmOpSchedule';
import type { ArrivalTimeTypes, ScheduleConstraint, StdcmConfigCardProps } from '../../types';

const StdcmDestination = ({ disabled = false }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const { getStdcmDestination } = useOsrdConfSelectors() as StdcmConfSelectors;

  const destination = useSelector(getStdcmDestination);

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;

  const { destinationArrival, destinationToleranceValues } = useMemo(
    () => ({
      destinationArrival: destination.arrival
        ? extractDateAndTimefromISO(destination.arrival)
        : undefined,
      destinationToleranceValues: {
        arrivalToleranceBefore: destination.tolerances?.before || 0,
        arrivalToleranceAfter: destination.tolerances?.after || 0,
      },
    }),
    [destination]
  );

  const onArrivalChange = (schedule: ScheduleConstraint) => {
    dispatch(
      updateStdcmPathStep({
        id: destination.id,
        updates: { arrival: generateISODateFromDateTime(schedule) },
      })
    );
  };

  const onArrivalTypeChange = (arrivalType: ArrivalTimeTypes) => {
    dispatch(updateStdcmPathStep({ id: destination.id, updates: { arrivalType } }));
  };

  const onToleranceChange = ({
    toleranceBefore,
    toleranceAfter,
  }: {
    toleranceBefore: number;
    toleranceAfter: number;
  }) => {
    dispatch(
      updateStdcmPathStep({
        id: destination.id,
        updates: { tolerances: { before: toleranceBefore, after: toleranceAfter } },
      })
    );
  };

  return (
    <StdcmCard
      data-testid="destination-card"
      name={t('trainPath.destination')}
      title={<img src={DestinationIcon} alt="destination" className="stdcm-destination-icon" />}
      disabled={disabled}
      className="extremity"
    >
      {'uic' in destination && (
        <StdcmOperationalPoint point={destination} opPointId={destination.id} disabled={disabled} />
      )}
      <StdcmOpSchedule
        onArrivalChange={onArrivalChange}
        onArrivalTypeChange={onArrivalTypeChange}
        onArrivalToleranceChange={onToleranceChange}
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
