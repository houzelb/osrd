/* eslint-disable react/jsx-no-useless-fragment */
import { useCallback, useEffect, useState } from 'react';

import { isEqual, isNil } from 'lodash';
import type { Operation } from 'react-datasheet-grid/dist/types';
import { useTranslation } from 'react-i18next';

import { useOsrdConfActions } from 'common/osrdContext';
import { isVia, matchPathStepAndOp } from 'modules/pathfinding/utils';
import type { SuggestedOP } from 'modules/trainschedule/components/ManageTrainSchedule/types';
import type { PathStep } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';

import {
  durationSinceStartTime,
  formatSuggestedViasToRowVias,
  onStopSignalToReceptionSignal,
  normalizeNullablesInRow,
  updateDaySinceDeparture,
  updateRowTimesAndMargin,
} from './helpers/utils';
import TimesStops from './TimesStops';
import { TableType, type TimesStopsInputRow } from './types';

type ClearButtonProps = {
  removeVia: () => void;
  rowIndex: number;
  rowData: TimesStopsInputRow;
  allWaypoints?: SuggestedOP[];
  pathSteps: PathStep[];
};

const createClearViaButton = ({
  removeVia,
  rowIndex,
  rowData,
  allWaypoints,
  pathSteps,
}: ClearButtonProps) => {
  const isClearBtnShown =
    allWaypoints &&
    rowIndex > 0 &&
    rowIndex < allWaypoints.length - 1 &&
    isVia(pathSteps || [], rowData, { withKP: true }) &&
    (!isNil(rowData.stopFor) ||
      rowData.theoreticalMargin !== undefined ||
      rowData.arrival !== undefined ||
      rowData.onStopSignal === true);
  if (isClearBtnShown) {
    return (
      <button data-testid="remove-via-button" type="button" onClick={removeVia}>
        ❌
      </button>
    );
  }
  return <></>;
};

type TimesStopsInputProps = {
  allWaypoints?: SuggestedOP[];
  startTime: string;
  pathSteps: PathStep[];
};

const TimesStopsInput = ({ allWaypoints, startTime, pathSteps }: TimesStopsInputProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('timesStops');
  const { updatePathSteps, upsertSeveralViasFromSuggestedOP } = useOsrdConfActions();

  const [rows, setRows] = useState<TimesStopsInputRow[]>([]);

  const clearPathStep = (rowData: TimesStopsInputRow) => {
    const index = pathSteps.findIndex(
      (step) => matchPathStepAndOp(step, rowData) && step.positionOnPath === rowData.positionOnPath
    );

    const updatedPathSteps = pathSteps.map((step, i) => {
      if (i === index) {
        return {
          ...step,
          stopFor: undefined,
          theoreticalMargin: undefined,
          arrival: undefined,
          receptionSignal: undefined,
        };
      }
      return step;
    });
    dispatch(updatePathSteps({ pathSteps: updatedPathSteps }));
  };

  const onChange = useCallback(
    (newRows: TimesStopsInputRow[], operation: Operation) => {
      let updatedRows = [...newRows];
      updatedRows[operation.fromRowIndex] = updateRowTimesAndMargin(
        newRows[operation.fromRowIndex],
        rows[operation.fromRowIndex],
        operation,
        rows.length
      );
      updatedRows = updateDaySinceDeparture(updatedRows, startTime);

      if (!updatedRows[operation.fromRowIndex].isMarginValid) {
        newRows[operation.fromRowIndex].isMarginValid = false;
        setRows(newRows);
        return;
      }

      const newVias = updatedRows
        .filter(
          (row, index) =>
            !isEqual(normalizeNullablesInRow(row), normalizeNullablesInRow(rows[index]))
        )
        .map(({ shortSlipDistance, onStopSignal, arrival, departure, ...row }) => ({
          ...row,
          arrival: durationSinceStartTime(startTime, arrival),
          departure: durationSinceStartTime(startTime, departure),
          receptionSignal: onStopSignalToReceptionSignal(onStopSignal, shortSlipDistance),
        }));
      dispatch(upsertSeveralViasFromSuggestedOP(newVias));
    },
    [rows, startTime]
  );

  useEffect(() => {
    if (allWaypoints) {
      const suggestedOPs = formatSuggestedViasToRowVias(
        allWaypoints,
        pathSteps || [],
        t,
        startTime,
        TableType.Input
      );
      setRows(updateDaySinceDeparture(suggestedOPs, startTime, { keepFirstIndexArrival: true }));
    }
  }, [allWaypoints, pathSteps, startTime]);

  return (
    <TimesStops
      rows={rows}
      tableType={TableType.Input}
      stickyRightColumn={{
        component: ({ rowData, rowIndex }) =>
          createClearViaButton({
            removeVia: () => clearPathStep(rowData),
            rowIndex,
            rowData,
            allWaypoints,
            pathSteps,
          }),
      }}
      onChange={onChange}
    />
  );
};

export default TimesStopsInput;
