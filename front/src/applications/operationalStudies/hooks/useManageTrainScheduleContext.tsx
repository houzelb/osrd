import { createContext, useContext, useMemo, type ReactNode, useState } from 'react';

import type { InfraWithState } from 'common/api/osrdEditoastApi';
import type { RangedValue } from 'common/types';
import getPathVoltages from 'modules/pathfinding/helpers/getPathVoltages';
import usePathfinding from 'modules/pathfinding/hooks/usePathfinding';
import type { PathfindingState } from 'modules/pathfinding/types';
import type { PathStep } from 'reducers/osrdconf/types';

import type { ManageTrainSchedulePathProperties } from '../types';

type ManageTrainScheduleContextType = {
  pathProperties?: ManageTrainSchedulePathProperties;
  setPathProperties: (pathProperties?: ManageTrainSchedulePathProperties) => void;
  voltageRanges: RangedValue[];
  launchPathfinding: (pathSteps: (PathStep | null)[]) => void;
  pathfindingState: PathfindingState;
  infraInfo: { infra?: InfraWithState; reloadCount: number };
} | null;

const ManageTrainScheduleContext = createContext<ManageTrainScheduleContextType>(null);

type ManageTrainScheduleContextProviderProps = { children: ReactNode };

export const ManageTrainScheduleContextProvider = ({
  children,
}: ManageTrainScheduleContextProviderProps) => {
  const [pathProperties, setPathProperties] = useState<ManageTrainSchedulePathProperties>();

  const { launchPathfinding, pathfindingState, infraInfo } = usePathfinding(setPathProperties);

  const voltageRanges = useMemo(
    () => getPathVoltages(pathProperties?.electrifications, pathProperties?.length),
    [pathProperties]
  );

  const providedContext = useMemo(
    () => ({
      pathProperties,
      setPathProperties,
      voltageRanges,
      launchPathfinding,
      pathfindingState,
      infraInfo,
    }),
    [
      pathProperties,
      setPathProperties,
      voltageRanges,
      launchPathfinding,
      pathfindingState,
      infraInfo,
    ]
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
