import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getTimesInfoFromDate } from 'applications/stdcm/utils';
import DestinationIcon from 'assets/pictures/mapMarkers/destination.svg';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import { useAppDispatch } from 'store';

import StdcmCard from './StdcmCard';
import StdcmOperationalPoint from './StdcmOperationalPoint';
import StdcmOpSchedule from './StdcmOpSchedule';
import type { ArrivalTimeTypes, ScheduleConstraint, StdcmConfigCardProps } from '../../types';

const StdcmDestination = ({ disabled = false, showErrors }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const { getStdcmDestination } = useOsrdConfSelectors() as StdcmConfSelectors;

  const destination = useSelector(getStdcmDestination);

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;

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

  const onArrivalChange = ({ date, hours, minutes }: ScheduleConstraint) => {
    date.setHours(hours, minutes);
    dispatch(
      updateStdcmPathStep({
        id: destination.id,
        updates: { arrival: date },
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
      <StdcmOperationalPoint
        location={destination.location}
        pathStepId={destination.id}
        disabled={disabled}
        showErrors={showErrors}
      />
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
