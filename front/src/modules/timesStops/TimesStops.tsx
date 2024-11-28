import cx from 'classnames';
import { DynamicDataSheetGrid, type DataSheetGridProps } from 'react-datasheet-grid';
import type { Operation } from 'react-datasheet-grid/dist/types';
import { useTranslation } from 'react-i18next';

import { Loader } from 'common/Loaders/Loader';

import { useTimesStopsColumns } from './hooks/useTimesStopsColumns';
import { type TableType, type TimesStopsRow } from './types';

type TimesStopsProps<T extends TimesStopsRow> = {
  rows: T[];
  tableType: TableType;
  cellClassName?: DataSheetGridProps['cellClassName'];
  stickyRightColumn?: DataSheetGridProps['stickyRightColumn'];
  headerRowHeight?: number;
  onChange?: (newRows: T[], operation: Operation) => void;
  dataIsLoading: boolean;
};

const TimesStops = <T extends TimesStopsRow>({
  rows,
  tableType,
  cellClassName,
  stickyRightColumn,
  headerRowHeight,
  onChange,
  dataIsLoading,
}: TimesStopsProps<T>) => {
  const { t } = useTranslation('timesStops');

  const columns = useTimesStopsColumns(tableType, rows);

  if (dataIsLoading) {
    return (
      <div style={{ height: '600px' }}>
        <Loader />
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <p className="pt-1 px-5">{t('noPathLoaded')}</p>
      </div>
    );
  }

  return (
    <DynamicDataSheetGrid
      className="time-stops-datasheet"
      columns={columns}
      value={rows}
      onChange={(newRows: T[], [op]) => {
        if (onChange) {
          onChange(newRows, op);
        }
      }}
      stickyRightColumn={stickyRightColumn}
      lockRows
      height={600}
      headerRowHeight={headerRowHeight}
      rowClassName={({ rowData, rowIndex }) =>
        cx({
          activeRow: rowData.isWaypoint,
          oddRow: (rowIndex + 1) % 2,
        })
      }
      cellClassName={cellClassName}
    />
  );
};

export default TimesStops;
