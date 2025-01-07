import { useEffect } from 'react';

import { Input, ComboBox } from '@osrd-project/ui-core';
import { useTranslation } from 'react-i18next';

import useStdcmTowedRollingStock from 'applications/stdcm/hooks/useStdcmTowedRollingStock';
import type { LightRollingStockWithLiveries, TowedRollingStock } from 'common/api/osrdEditoastApi';
import { useOsrdConfActions } from 'common/osrdContext';
import SpeedLimitByTagSelector from 'common/SpeedLimitByTagSelector/SpeedLimitByTagSelector';
import { useStoreDataForSpeedLimitByTagSelector } from 'common/SpeedLimitByTagSelector/useStoreDataForSpeedLimitByTagSelector';
import RollingStock2Img from 'modules/rollingStock/components/RollingStock2Img';
import { useStoreDataForRollingStockSelector } from 'modules/rollingStock/components/RollingStockSelector/useStoreDataForRollingStockSelector';
import useFilterRollingStock from 'modules/rollingStock/hooks/useFilterRollingStock';
import useFilterTowedRollingStock from 'modules/towedRollingStock/hooks/useFilterTowedRollingStock';
import { type StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import { useAppDispatch } from 'store';

import StdcmCard from './StdcmCard';
import useStdcmConsist from '../../hooks/useStdcmConsist';
import type { StdcmConfigCardProps } from '../../types';

const ConsistCardTitle = ({
  rollingStock,
}: {
  rollingStock?: LightRollingStockWithLiveries | null;
}) => {
  if (!rollingStock) return null;

  return (
    <div className="stdcm-consist-img">
      <RollingStock2Img rollingStock={rollingStock} />
    </div>
  );
};

const StdcmConsist = ({ disabled = false, showErrors }: StdcmConfigCardProps) => {
  const { t } = useTranslation('stdcm');
  const { speedLimitByTag, speedLimitsByTags, dispatchUpdateSpeedLimitByTag } =
    useStoreDataForSpeedLimitByTagSelector({ isStdcm: true });

  const { updateRollingStockID, updateTowedRollingStockID } =
    useOsrdConfActions() as StdcmConfSliceActions;
  const dispatch = useAppDispatch();

  const { rollingStock } = useStoreDataForRollingStockSelector();
  const towedRollingStock = useStdcmTowedRollingStock();

  const {
    totalMass,
    onTotalMassChange,
    totalLength,
    onTotalLengthChange,
    maxSpeed,
    onMaxSpeedChange,
    prefillConsist,
  } = useStdcmConsist();

  const { filters, searchRollingStock, searchRollingStockById, filteredRollingStockList } =
    useFilterRollingStock({ isStdcm: true });

  const {
    filteredTowedRollingStockList,
    searchTowedRollingStock,
    searchTowedRollingStockById,
    filters: towedRsFilters,
  } = useFilterTowedRollingStock();

  const isTractionEngineEmpty = !filters.text.trim();
  const isTowedRollingStockEmpty = !towedRsFilters.text.trim();
  const isTotalMassEmpty = totalMass === undefined || totalMass === null;
  const isTotalLengthEmpty = totalLength === undefined || totalLength === null;
  const isMaxSpeedEmpty = maxSpeed === undefined || maxSpeed === null;

  useEffect(() => {
    if (towedRollingStock) {
      searchTowedRollingStock(towedRollingStock.name);
    } else {
      searchTowedRollingStock('');
    }
  }, [towedRollingStock]);

  const getLabel = (rs: LightRollingStockWithLiveries) => {
    const secondPart = rs.metadata?.series || rs.metadata?.reference || '';
    return secondPart ? `${rs.name} - ${secondPart}` : rs.name;
  };

  const onInputClick = () => {
    if (rollingStock?.id !== undefined) {
      searchRollingStockById(rollingStock.id);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchRollingStock(e.target.value);
    if (e.target.value.trim().length === 0) {
      dispatch(updateRollingStockID(undefined));
    }
  };

  const onSelectSuggestion = (option?: LightRollingStockWithLiveries) => {
    prefillConsist(option, towedRollingStock, speedLimitByTag);
    dispatch(updateRollingStockID(option?.id));
  };

  const onSpeedLimitByTagChange = (newTag: string | null) => {
    prefillConsist(rollingStock, towedRollingStock, newTag);
    dispatchUpdateSpeedLimitByTag(newTag);
  };

  useEffect(() => {
    if (rollingStock) {
      searchRollingStock(getLabel(rollingStock));
    } else {
      searchRollingStock('');
    }
  }, [rollingStock]);

  return (
    <StdcmCard
      name={t('consist.consist')}
      title={<ConsistCardTitle rollingStock={rollingStock} />}
      disabled={disabled}
      className="consist"
    >
      <div className="traction-engine">
        <ComboBox
          id="tractionEngine"
          label={t('consist.tractionEngine')}
          value={filters.text.toUpperCase()}
          onClick={onInputClick}
          onChange={onInputChange}
          autoComplete="off"
          disabled={disabled}
          suggestions={filteredRollingStockList}
          getSuggestionLabel={(suggestion: LightRollingStockWithLiveries) => getLabel(suggestion)}
          onSelectSuggestion={onSelectSuggestion}
          statusWithMessage={
            showErrors && isTractionEngineEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
      </div>
      <div className="towed-rolling-stock">
        <ComboBox
          id="towedRollingStock"
          label={t('consist.towedRollingStock')}
          value={towedRsFilters.text.toUpperCase()}
          onClick={() => {
            if (towedRollingStock?.id !== undefined) {
              searchTowedRollingStockById(towedRollingStock.id);
            }
          }}
          onChange={(e) => {
            searchTowedRollingStock(e.target.value);
            if (e.target.value.trim().length === 0) {
              updateTowedRollingStockID(undefined);
            }
          }}
          autoComplete="off"
          disabled={disabled}
          suggestions={filteredTowedRollingStockList}
          getSuggestionLabel={(suggestion: TowedRollingStock) => suggestion.name}
          onSelectSuggestion={(towed) => {
            prefillConsist(rollingStock, towed, speedLimitByTag);
            dispatch(updateTowedRollingStockID(towed?.id));
          }}
          statusWithMessage={
            showErrors && isTowedRollingStockEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
      </div>
      <div className="stdcm-consist__properties">
        <Input
          id="tonnage"
          label={t('consist.tonnage')}
          trailingContent="t"
          type="number"
          min={0}
          value={totalMass ?? ''}
          onChange={onTotalMassChange}
          disabled={disabled}
          statusWithMessage={
            showErrors && isTotalMassEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
        <Input
          id="length"
          label={t('consist.length')}
          trailingContent="m"
          type="number"
          min={0}
          value={totalLength ?? ''}
          onChange={onTotalLengthChange}
          disabled={disabled}
          statusWithMessage={
            showErrors && isTotalLengthEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
      </div>
      <div className="stdcm-consist__properties">
        <SpeedLimitByTagSelector
          disabled={disabled}
          selectedSpeedLimitByTag={speedLimitByTag}
          speedLimitsByTags={speedLimitsByTags}
          dispatchUpdateSpeedLimitByTag={onSpeedLimitByTagChange}
        />
        <Input
          id="maxSpeed"
          label={t('consist.maxSpeed')}
          trailingContent="km/h"
          type="number"
          min={0}
          value={maxSpeed ?? ''}
          onChange={onMaxSpeedChange}
          disabled={disabled}
          statusWithMessage={
            showErrors && isMaxSpeedEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
      </div>
    </StdcmCard>
  );
};

export default StdcmConsist;
