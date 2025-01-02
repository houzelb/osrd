import { useMemo, useEffect, useState } from 'react';

import { Input } from '@osrd-project/ui-core';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { StdcmStopTypes } from '../../types';

type StopDurationInputProps = {
  stopType: StdcmStopTypes;
  stopDuration?: number;
  updatePathStepStopTime: (stopTime: string) => void;
};

const StopDurationInput = ({
  stopType,
  stopDuration,
  updatePathStepStopTime,
}: StopDurationInputProps) => {
  const { t } = useTranslation('stdcm');

  const [pathStepStopTime, setPathStepStopTime] = useState('');

  const stopWarning = stopType === StdcmStopTypes.DRIVER_SWITCH && stopDuration && stopDuration < 3;

  const debounceUpdatePathStepStopTime = useMemo(
    () => debounce((value) => updatePathStepStopTime(value), 300),
    []
  );

  useEffect(() => {
    setPathStepStopTime(stopDuration !== undefined ? `${stopDuration}` : '');
  }, [stopDuration]);

  return (
    stopType !== StdcmStopTypes.PASSAGE_TIME && (
      <div className="stop-time">
        <Input
          id="stdcm-via-stop-time"
          type="text"
          label={t('trainPath.stopFor')}
          onChange={(e) => {
            // TODO: Find a better way to prevent user from entering decimal values
            const value = e.target.value.replace(/[\D.,]/g, '');
            setPathStepStopTime(value);
            debounceUpdatePathStepStopTime(value);
          }}
          value={pathStepStopTime}
          trailingContent="minutes"
          statusWithMessage={
            stopWarning
              ? {
                  status: 'warning',
                  message: t('trainPath.warningMinStopTime'),
                }
              : undefined
          }
        />
      </div>
    )
  );
};

export default StopDurationInput;
