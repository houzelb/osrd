import { useSelector } from 'react-redux';

import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import { getRollingStockComfort } from 'reducers/osrdconf/operationalStudiesConf/selectors';

export const useStoreDataForRollingStockSelector = () => {
  const { getRollingStockID } = useOsrdConfSelectors();
  const rollingStockId = useSelector(getRollingStockID);
  const rollingStockComfort = useSelector(getRollingStockComfort);

  const { currentData: rollingStock } =
    osrdEditoastApi.endpoints.getRollingStockByRollingStockId.useQuery(
      {
        rollingStockId: rollingStockId!,
      },
      {
        skip: !rollingStockId,
      }
    );

  return {
    rollingStockId,
    rollingStockComfort: rollingStockId ? rollingStockComfort : 'STANDARD',
    rollingStock: rollingStockId ? rollingStock : undefined,
  };
};

export default useStoreDataForRollingStockSelector;
