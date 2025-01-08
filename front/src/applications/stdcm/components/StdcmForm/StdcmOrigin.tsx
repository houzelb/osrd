import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getTimesInfoFromDate } from 'applications/stdcm/utils';
import OriginIcon from 'assets/pictures/mapMarkers/start.svg';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import { useAppDispatch } from 'store';

import StdcmCard from './StdcmCard';
import StdcmOperationalPoint from './StdcmOperationalPoint';
import StdcmOpSchedule from './StdcmOpSchedule';
import type { ArrivalTimeTypes, ScheduleConstraint, StdcmConfigCardProps } from '../../types';

const StdcmOrigin = ({ disabled = false, showErrors }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const { getStdcmOrigin } = useOsrdConfSelectors() as StdcmConfSelectors;
  const origin = useSelector(getStdcmOrigin);

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;

  const { originArrival, originToleranceValues } = useMemo(
    () => ({
      originArrival: getTimesInfoFromDate(origin.arrival),
      originToleranceValues: {
        arrivalToleranceBefore: origin.tolerances?.before || 0,
        arrivalToleranceAfter: origin.tolerances?.after || 0,
      },
    }),
    [origin]
  );

  const onOriginArrivalChange = ({ date, hours, minutes }: ScheduleConstraint) => {
    date.setHours(hours, minutes);
    dispatch(
      updateStdcmPathStep({
        id: origin.id,
        updates: { arrival: date },
      })
    );
  };

  const onOriginArrivalTypeChange = (arrivalType: ArrivalTimeTypes) => {
    dispatch(
      updateStdcmPathStep({
        id: origin.id,
        updates: { arrivalType },
      })
    );
  };

  const onOriginToleranceChange = ({
    toleranceBefore,
    toleranceAfter,
  }: {
    toleranceBefore: number;
    toleranceAfter: number;
  }) => {
    dispatch(
      updateStdcmPathStep({
        id: origin.id,
        updates: { tolerances: { before: toleranceBefore, after: toleranceAfter } },
      })
    );
  };

  return (
    <StdcmCard
      name={t('trainPath.origin')}
      title={<img src={OriginIcon} alt="origin" className="stdcm-origin-icon" />}
      className="extremity"
      disabled={disabled}
      hasTip
    >
      <StdcmOperationalPoint
        location={origin.location}
        pathStepId={origin.id}
        disabled={disabled}
        showErrors={showErrors}
      />
      <StdcmOpSchedule
        onArrivalChange={onOriginArrivalChange}
        onArrivalTypeChange={onOriginArrivalTypeChange}
        onArrivalToleranceChange={onOriginToleranceChange}
        opTimingData={originArrival}
        opToleranceValues={originToleranceValues}
        opScheduleTimeType={origin.arrivalType}
        disabled={disabled}
        opId="origin-arrival"
        isOrigin
      />
    </StdcmCard>
  );
};

export default StdcmOrigin;
