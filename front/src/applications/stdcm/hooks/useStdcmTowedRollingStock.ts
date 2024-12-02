import { useSelector } from 'react-redux';

import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';

const useStdcmTowedRollingStock = () => {
  const { getTowedRollingStockID } = useOsrdConfSelectors() as StdcmConfSelectors;
  const towedRollingStockId = useSelector(getTowedRollingStockID);

  const { currentData: towedRollingStock } =
    osrdEditoastApi.endpoints.getTowedRollingStockByTowedRollingStockId.useQuery(
      {
        towedRollingStockId: towedRollingStockId!,
      },
      {
        skip: !towedRollingStockId,
      }
    );

  return towedRollingStock;
};

export default useStdcmTowedRollingStock;
