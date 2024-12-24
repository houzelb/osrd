import { useEffect, useMemo } from 'react';

import { DatePicker, Select, TimePicker, TolerancePicker } from '@osrd-project/ui-core';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmPathStep } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';
import { formatDateString, isArrivalDateInSearchTimeWindow } from 'utils/date';
import { createStringSelectOptions } from 'utils/uiCoreHelpers';

import type { ArrivalTimeTypes, ScheduleConstraint } from '../../types';

type StdcmOpScheduleProps = {
  disabled: boolean;
  pathStep: Extract<StdcmPathStep, { isVia: false }>;
  opTimingData?: {
    date: Date;
    arrivalDate: string;
    arrivalTime: string;
    arrivalTimeHours: number;
    arrivalTimeMinutes: number;
  };
  opId: string;
  isOrigin?: boolean;
};

const defaultDate = (date?: Date) => {
  const newDate = date ? new Date(date) : new Date();
  newDate.setHours(0, 0, 0);
  return newDate;
};

const StdcmOpSchedule = ({
  disabled,
  pathStep,
  opTimingData,
  opId,
  isOrigin = false,
}: StdcmOpScheduleProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;
  const { getSearchDatetimeWindow } = useOsrdConfSelectors();
  const searchDatetimeWindow = useSelector(getSearchDatetimeWindow);

  const { arrivalDate, arrivalTime, arrivalTimeHours, arrivalTimeMinutes } = useMemo(() => {
    const isArrivalDateValid =
      opTimingData?.arrivalDate &&
      isArrivalDateInSearchTimeWindow(opTimingData.date, searchDatetimeWindow);

    return {
      arrivalDate:
        opTimingData && isArrivalDateValid
          ? opTimingData.date
          : defaultDate(searchDatetimeWindow?.begin),
      arrivalTime: opTimingData?.arrivalTime,
      arrivalTimeHours: opTimingData?.arrivalTimeHours,
      arrivalTimeMinutes: opTimingData?.arrivalTimeMinutes,
    };
  }, [opTimingData, searchDatetimeWindow]);

  const tolerances = useMemo(
    () => ({
      minusTolerance: pathStep.tolerances.before,
      plusTolerance: pathStep.tolerances.after,
    }),
    [pathStep.tolerances]
  );

  const selectableSlot = useMemo(
    () =>
      searchDatetimeWindow
        ? {
            start: searchDatetimeWindow.begin,
            end: searchDatetimeWindow.end,
          }
        : undefined,
    [searchDatetimeWindow]
  );

  const datePickerErrorMessages = useMemo(
    () => ({
      invalidInput: t('form.datePickerErrors.invalidInput'),
      invalidDate: t('form.datePickerErrors.invalidDate', {
        startDate: formatDateString(searchDatetimeWindow?.begin),
        endDate: formatDateString(searchDatetimeWindow?.end),
      }),
    }),
    [t, searchDatetimeWindow]
  );

  const onArrivalChange = ({ date, hours, minutes }: ScheduleConstraint) => {
    date.setHours(hours, minutes);
    dispatch(
      updateStdcmPathStep({
        id: pathStep.id,
        updates: { arrival: date },
      })
    );
  };

  const onArrivalTypeChange = (arrivalType: ArrivalTimeTypes) => {
    dispatch(updateStdcmPathStep({ id: pathStep.id, updates: { arrivalType } }));
  };

  useEffect(() => {
    if (
      (!isArrivalDateInSearchTimeWindow(arrivalDate, searchDatetimeWindow) ||
        !opTimingData?.arrivalDate) &&
      pathStep.arrivalType === 'preciseTime'
    ) {
      onArrivalChange({
        date: defaultDate(searchDatetimeWindow?.begin),
        hours: arrivalTimeHours || 0,
        minutes: arrivalTimeMinutes || 0,
      });
    }
  }, [searchDatetimeWindow, pathStep.arrivalType]);

  return (
    <>
      <div className="arrival-type-select">
        <Select
          id={`select-${opId}`}
          value={pathStep.arrivalType}
          onChange={(e) => {
            if (e) {
              onArrivalTypeChange(e as ArrivalTimeTypes);
            }
          }}
          {...createStringSelectOptions(
            isOrigin
              ? ['preciseTime', 'respectDestinationSchedule']
              : ['preciseTime', 'asSoonAsPossible']
          )}
          getOptionLabel={(option) => t(`trainPath.${option}`)}
          disabled={disabled}
        />
      </div>
      {pathStep.arrivalType === 'preciseTime' && (
        <div className="schedule">
          <DatePicker
            inputProps={{
              id: `date-${opId}`,
              label: t('trainPath.date'),
              name: 'op-date',
              disabled,
            }}
            selectableSlot={selectableSlot}
            value={arrivalDate}
            onDateChange={(e) => {
              onArrivalChange({
                date: e,
                hours: arrivalTimeHours || 0,
                minutes: arrivalTimeMinutes || 0,
              });
            }}
            errorMessages={datePickerErrorMessages}
          />
          <TimePicker
            id={`time-${opId}`}
            label={t('trainPath.time')}
            hours={arrivalTimeHours}
            minutes={arrivalTimeMinutes}
            onTimeChange={({ hours, minutes }) => {
              onArrivalChange({ date: arrivalDate, hours, minutes });
            }}
            disabled={disabled}
            value={arrivalTime}
            readOnly={false}
          />
          <div className="mr-n2 pr-1">
            <TolerancePicker
              id={`stdcm-tolerance-${opId}`}
              label={t('trainPath.tolerance')}
              toleranceValues={tolerances}
              onChange={() => {}}
              onToleranceChange={({ minusTolerance, plusTolerance }) => {
                dispatch(
                  updateStdcmPathStep({
                    id: pathStep.id,
                    updates: { tolerances: { before: minusTolerance, after: plusTolerance } },
                  })
                );
              }}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default StdcmOpSchedule;
