import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getTimesInfoFromDate } from 'applications/stdcm/utils';
import OriginIcon from 'assets/pictures/mapMarkers/start.svg';
import { useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';

import StdcmCard from './StdcmCard';
import StdcmOperationalPoint from './StdcmOperationalPoint';
import StdcmOpSchedule from './StdcmOpSchedule';
import type { StdcmConfigCardProps } from '../../types';

const StdcmOrigin = ({ disabled = false }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');

  const { getStdcmOrigin } = useOsrdConfSelectors() as StdcmConfSelectors;
  const origin = useSelector(getStdcmOrigin);

  const { originArrival } = useMemo(
    () => ({
      originArrival: getTimesInfoFromDate(origin.arrival),
    }),
    [origin]
  );

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
      />
      <StdcmOpSchedule
        pathStep={origin}
        opTimingData={originArrival}
        disabled={disabled}
        opId="origin-arrival"
        isOrigin
      />
    </StdcmCard>
  );
};

export default StdcmOrigin;
