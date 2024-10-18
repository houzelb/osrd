import { useEffect, useState } from 'react';

import { isEqual } from 'lodash';

import { osrdEditoastApi, type TowedRollingStock } from 'common/api/osrdEditoastApi';
import { setFailure } from 'reducers/main';
import { useAppDispatch } from 'store';
import { castErrorToFailure } from 'utils/error';

export interface TowedRollingStockFilters {
  id?: number;
  text: string;
}

const initialFilters: TowedRollingStockFilters = {
  text: '',
};

function filterTowedRollingStocks(
  towedRollingStockList: TowedRollingStock[],
  filters: TowedRollingStockFilters
) {
  if (isEqual(filters, initialFilters)) return towedRollingStockList;
  return towedRollingStockList.filter(({ id, name }) => {
    if (filters.id !== undefined) {
      return id === filters.id;
    }
    if (!filters.text) {
      return true;
    }
    return name.trim().toLowerCase().includes(filters.text.trim().toLowerCase());
  });
}

const useFilterTowedRollingStock = () => {
  const dispatch = useAppDispatch();
  const [filters, setFilters] = useState<TowedRollingStockFilters>({ text: '' });
  const [filteredTowedRollingStockList, setFilteredTowedRollingStockList] = useState<
    TowedRollingStock[]
  >([]);

  const {
    data: { results: allTowedRollingStocks } = { results: [] },
    isSuccess,
    isError,
    error,
  } = osrdEditoastApi.endpoints.getTowedRollingStock.useQuery({
    pageSize: 50,
  });

  const searchTowedRollingStock = (value: string) => {
    setFilters({ id: undefined, text: value });
  };

  const searchTowedRollingStockById = (id?: number) => {
    setFilters({ ...filters, id });
  };

  useEffect(() => {
    if (isError && error) {
      dispatch(setFailure(castErrorToFailure(error)));
    }
  }, [isError]);

  useEffect(() => {
    const newFilteredTowedRollingStocks = filterTowedRollingStocks(allTowedRollingStocks, filters);
    setTimeout(() => {
      setFilteredTowedRollingStockList(newFilteredTowedRollingStocks);
    }, 0);
  }, [isSuccess, filters, allTowedRollingStocks]);

  return {
    allTowedRollingStocks,
    filteredTowedRollingStockList,
    filters,
    searchTowedRollingStock,
    searchTowedRollingStockById,
  };
};

export default useFilterTowedRollingStock;
