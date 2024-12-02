import { createContext, useContext, useMemo, type ReactNode, useState } from 'react';

import type { RangedValue } from 'common/types';
import getPathVoltages from 'modules/pathfinding/helpers/getPathVoltages';

import type { ManageTrainSchedulePathProperties } from '../types';

type ManageTrainScheduleContextType = {
  pathProperties?: ManageTrainSchedulePathProperties;
  setPathProperties: (pathProperties?: ManageTrainSchedulePathProperties) => void;
  voltageRanges: RangedValue[];
} | null;

const ManageTrainScheduleContext = createContext<ManageTrainScheduleContextType>(null);

type ManageTrainScheduleContextProviderProps = { children: ReactNode };

export const ManageTrainScheduleContextProvider = ({
  children,
}: ManageTrainScheduleContextProviderProps) => {
  const [pathProperties, setPathProperties] = useState<ManageTrainSchedulePathProperties>();

  const voltageRanges = useMemo(
    () => getPathVoltages(pathProperties?.electrifications, pathProperties?.length),
    [pathProperties]
  );

  const providedContext = useMemo(
    () => ({
      pathProperties,
      setPathProperties,
      voltageRanges,
    }),
    [pathProperties, setPathProperties, voltageRanges]
  );

  return (
    <ManageTrainScheduleContext.Provider value={providedContext}>
      {children}
    </ManageTrainScheduleContext.Provider>
  );
};

export const useManageTrainScheduleContext = () => {
  const context = useContext(ManageTrainScheduleContext);
  if (!context) {
    throw new Error(
      'useManageTrainScheduleContext must be used within a ManageTrainScheduleContext'
    );
  }
  return context;
};
