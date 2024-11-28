import { useMemo } from 'react';

import cx from 'classnames';
import { keyColumn, type Column, checkboxColumn, createTextColumn } from 'react-datasheet-grid';
import type { CellComponent } from 'react-datasheet-grid/dist/types';
import { useTranslation } from 'react-i18next';

import { NO_BREAK_SPACE } from 'utils/strings';

import { marginRegExValidation } from '../consts';
import { disabledTextColumn } from '../helpers/utils';
import ReadOnlyTime from '../ReadOnlyTime';
import TimeInput from '../TimeInput';
import { TableType, type TimeExtraDays, type TimeStopsRow } from '../types';

const timeColumn = (isOutputTable: boolean) =>
  ({
    component: (isOutputTable ? ReadOnlyTime : TimeInput) as CellComponent<
      TimeExtraDays | undefined,
      string
    >,
    deleteValue: () => undefined,
    copyValue: ({ rowData }) => rowData?.time ?? null,
    pasteValue: ({ value }) => ({ time: value }),
    minWidth: isOutputTable ? 110 : 170,
    isCellEmpty: ({ rowData }) => !rowData,
  }) as Partial<Column<TimeExtraDays | undefined, string, string>>;

const fixedWidth = (width: number) => ({ minWidth: width, maxWidth: width });

function headerWithTitleTagIfShortened(shortenedHeader: string, fullHeader: string) {
  if (shortenedHeader === fullHeader) return fullHeader;
  return <span title={fullHeader}> {shortenedHeader} </span>;
}

export const useTimeStopsColumns = <T extends TimeStopsRow>(
  tableType: TableType,
  allWaypoints: T[] = []
) => {
  const { t } = useTranslation('timesStops');

  const columns = useMemo<Column<T>[]>(() => {
    const isOutputTable = tableType === TableType.Output;
    const extraOutputColumns = (
      isOutputTable
        ? [
            {
              ...disabledTextColumn('theoreticalMarginSeconds', t('theoreticalMarginSeconds'), {
                alignRight: true,
              }),
              headerClassName: 'padded-header',
              ...fixedWidth(90),
            },
            {
              ...disabledTextColumn('calculatedMargin', t('realMargin'), { alignRight: true }),
              headerClassName: 'padded-header',
              ...fixedWidth(90),
            },
            {
              ...disabledTextColumn('diffMargins', t('diffMargins'), { alignRight: true }),
              title: headerWithTitleTagIfShortened(t('diffMargins'), t('diffMarginsFull')),
              headerClassName: 'padded-header',
              ...fixedWidth(90),
            },
            {
              ...disabledTextColumn('calculatedArrival', t('calculatedArrivalTime')),
              headerClassName: 'padded-header',
              ...fixedWidth(105),
            },
            {
              ...disabledTextColumn('calculatedDeparture', t('calculatedDepartureTime')),
              title: headerWithTitleTagIfShortened(
                t('calculatedDepartureTime'),
                t('calculatedDepartureTimeFull')
              ),
              headerClassName: 'padded-header',
              ...fixedWidth(105),
            },
          ]
        : []
    ) as Column<T>[];

    return [
      {
        ...keyColumn('name', createTextColumn()),
        title: t('name'),
        ...(isOutputTable && {
          component: ({ rowData }) => (
            <span title={rowData.name} className="ml-1 text-nowrap overflow-hidden">
              {rowData.name}
            </span>
          ),
        }),
        disabled: true,
        minWidth: isOutputTable ? undefined : 300,
      },
      {
        ...keyColumn('ch', createTextColumn()),
        title: t('ch'),
        disabled: true,
        ...fixedWidth(45),
      },
      {
        ...keyColumn('arrival', timeColumn(isOutputTable)),
        title: t('arrivalTime'),
        headerClassName: 'padded-header',
        ...fixedWidth(isOutputTable ? 105 : 125),

        // We should not be able to edit the arrival time of the origin
        disabled: ({ rowIndex }) => isOutputTable || rowIndex === 0,
      },
      {
        ...keyColumn(
          'stopFor',
          createTextColumn({
            continuousUpdates: false,
            alignRight: true,
          })
        ),
        title: t('stopTime'),
        headerClassName: 'padded-header',
        disabled: isOutputTable,
        ...fixedWidth(80),
      },
      {
        ...keyColumn('departure', timeColumn(isOutputTable)),
        title: headerWithTitleTagIfShortened(t('departureTime'), t('departureTimeFull')),
        headerClassName: 'padded-header',
        ...fixedWidth(isOutputTable ? 105 : 125),

        // We should not be able to edit the departure time of the origin
        disabled: ({ rowIndex }) => isOutputTable || rowIndex === 0,
      },
      {
        ...keyColumn('onStopSignal', checkboxColumn as Partial<Column<boolean | undefined>>),
        title: headerWithTitleTagIfShortened(
          t('receptionOnClosedSignal'),
          t('receptionOnClosedSignalFull')
        ),
        headerClassName: 'padded-header',
        ...fixedWidth(81),

        // We should not be able to edit the reception on close signal if stopFor is not filled
        // except for the destination
        disabled: ({ rowData, rowIndex }) =>
          isOutputTable || (rowIndex !== allWaypoints.length - 1 && !rowData.stopFor),
      },
      {
        ...keyColumn('shortSlipDistance', checkboxColumn as Partial<Column<boolean | undefined>>),
        title: t('shortSlipDistance'),
        headerClassName: 'padded-header',
        ...fixedWidth(81),
        disabled: ({ rowData, rowIndex }) =>
          isOutputTable || (rowIndex !== allWaypoints.length - 1 && !rowData.onStopSignal),
      },
      {
        ...keyColumn(
          'theoreticalMargin',
          createTextColumn({
            continuousUpdates: false,
            placeholder: !isOutputTable ? t('theoreticalMarginPlaceholder') : '',
            formatBlurredInput: (value) => {
              if (!value) return '';
              if (!isOutputTable && !marginRegExValidation.test(value)) {
                return `${value}${t('theoreticalMarginPlaceholder')}`;
              }
              return value;
            },
            alignRight: true,
          })
        ),
        ...(isOutputTable && {
          component: ({ rowData }) => {
            if (!rowData.theoreticalMargin) return null;
            const [digits, unit] = rowData.theoreticalMargin.split(NO_BREAK_SPACE);
            return (
              <span className="dsg-input dsg-input-align-right self-center text-nowrap">
                {digits}
                {NO_BREAK_SPACE}
                {unit === 'min/100km' ? (
                  <span className="small-unit-container">
                    <span>min/</span>
                    <br />
                    <span>100km</span>
                  </span>
                ) : (
                  unit
                )}
              </span>
            );
          },
        }),
        cellClassName: ({ rowData }) =>
          cx({
            invalidCell: !isOutputTable && !rowData.isMarginValid,
            repeatedValue: rowData.isTheoreticalMarginBoundary === false, // the class should be added on false but not undefined
          }),
        title: t('theoreticalMargin'),
        headerClassName: 'padded-header',
        ...fixedWidth(isOutputTable ? 75 : 110),
        disabled: ({ rowIndex }) => isOutputTable || rowIndex === allWaypoints.length - 1,
      },
      ...extraOutputColumns,
    ] as Column<T>[];
  }, [tableType, t, allWaypoints.length]);

  return columns;
};

export default timeColumn;
