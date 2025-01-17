import { useEffect } from 'react';

import { Input, ComboBox } from '@osrd-project/ui-core';
import { useTranslation } from 'react-i18next';

import useStdcmTowedRollingStock from 'applications/stdcm/hooks/useStdcmTowedRollingStock';
import {
  CONSIST_MAX_SPEED_MIN,
  CONSIST_TOTAL_LENGTH_MAX,
  CONSIST_TOTAL_MASS_MAX,
} from 'applications/stdcm/utils/consistValidation';
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
import { kgToT, kmhToMs, msToKmh } from 'utils/physics';

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

const StdcmConsist = ({
  consistErrors = {},
  disabled = false,
  isDebugMode,
}: StdcmConfigCardProps) => {
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
            consistErrors?.totalMass
              ? {
                  status: 'error',
                  tooltip: 'left',
                  message: t(consistErrors.totalMass, {
                    low: Math.floor(
                      kgToT((rollingStock?.mass ?? 0) + (towedRollingStock?.mass ?? 0))
                    ),
                    high: CONSIST_TOTAL_MASS_MAX,
                  }),
                }
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
            consistErrors?.totalLength
              ? {
                  status: 'error',
                  tooltip: 'right',
                  message: t(consistErrors.totalLength, {
                    low: Math.floor((rollingStock?.length ?? 0) + (towedRollingStock?.length ?? 0)),
                    high: CONSIST_TOTAL_LENGTH_MAX,
                  }),
                }
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
          showPlaceHolder={isDebugMode}
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
            consistErrors?.maxSpeed
              ? {
                  status: 'error',
                  tooltip: 'right',
                  message: t(consistErrors.maxSpeed, {
                    low: CONSIST_MAX_SPEED_MIN,
                    high: Math.floor(
                      msToKmh(Math.min(rollingStock?.max_speed ?? kmhToMs(CONSIST_MAX_SPEED_MIN)))
                    ),
                  }),
                }
              : undefined
          }
        />
      </div>
    </StdcmCard>
  );
};

export default StdcmConsist;
