import { useState } from 'react';

import { min } from 'lodash';
import { useSelector } from 'react-redux';

import type { LightRollingStockWithLiveries, TowedRollingStock } from 'common/api/osrdEditoastApi';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import { type StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import { useAppDispatch } from 'store';
import { kgToT } from 'utils/physics';

const useStdcmConsist = () => {
  const dispatch = useAppDispatch();

  const [totalMassChanged, setTotalMassChanged] = useState(false);
  const [totalLengthChanged, setTotalLengthChanged] = useState(false);
  const [maxSpeedChanged, setMaxSpeedChanged] = useState(false);

  const { getTotalMass, getTotalLength, getMaxSpeed } =
    useOsrdConfSelectors() as StdcmConfSelectors;
  const { updateTotalMass, updateTotalLength, updateMaxSpeed } =
    useOsrdConfActions() as StdcmConfSliceActions;

  const totalMass = useSelector(getTotalMass);
  const onTotalMassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMassValue = Number(e.target.value);
    setTotalMassChanged(true);
    dispatch(updateTotalMass(totalMassValue === 0 ? undefined : totalMassValue));
  };

  const totalLength = useSelector(getTotalLength);
  const onTotalLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalLengthValue = Number(e.target.value);
    setTotalLengthChanged(true);
    dispatch(updateTotalLength(totalLengthValue === 0 ? undefined : totalLengthValue));
  };

  const maxSpeed = useSelector(getMaxSpeed);
  const onMaxSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMaxSpeed = Number(e.target.value);
    setMaxSpeedChanged(true);
    dispatch(updateMaxSpeed(totalMaxSpeed === 0 ? undefined : totalMaxSpeed));
  };

  const prefillConsist = (
    rollingStock?: LightRollingStockWithLiveries,
    towed?: TowedRollingStock
  ) => {
    if (!totalMassChanged) {
      const consistMass = Math.floor(kgToT((rollingStock?.mass ?? 0) + (towed?.mass ?? 0)));
      dispatch(updateTotalMass(consistMass > 0 ? consistMass : undefined));
    }

    if (!totalLengthChanged) {
      const consistLength = Math.floor((rollingStock?.length ?? 0) + (towed?.length ?? 0));
      dispatch(updateTotalLength(consistLength > 0 ? consistLength : undefined));
    }

    if (!maxSpeedChanged) {
      const consistMaxSpeed = min([rollingStock?.max_speed, towed?.max_speed]);
      dispatch(updateMaxSpeed(consistMaxSpeed ? Math.floor(consistMaxSpeed) : undefined));
    }
  };

  return {
    totalMass,
    onTotalMassChange,
    totalLength,
    onTotalLengthChange,
    maxSpeed,
    onMaxSpeedChange,
    prefillConsist,
  };
};

export default useStdcmConsist;
