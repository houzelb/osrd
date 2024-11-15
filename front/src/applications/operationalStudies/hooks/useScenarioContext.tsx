import { createContext, useContext, useMemo, type ReactNode } from 'react';

import useCachedTrackSections from 'applications/operationalStudies/hooks/useCachedTrackSections';
import type { TrackSection } from 'common/api/osrdEditoastApi';

type ScenarioContextType = {
  getTrackSectionsByIds: (requestedTrackIds: string[]) => Promise<Record<string, TrackSection>>;
  infraId: number;
  trackSectionsLoading: boolean;
} | null;
const ScenarioContext = createContext<ScenarioContextType>(null);

type ScenarioContextProviderProps = { infraId: number; children: ReactNode };

export const ScenarioContextProvider = ({ infraId, children }: ScenarioContextProviderProps) => {
  const { getTrackSectionsByIds, isLoading: trackSectionsLoading } =
    useCachedTrackSections(infraId);
  const providedContext = useMemo(
    () => ({
      getTrackSectionsByIds,
      infraId,
      trackSectionsLoading,
    }),
    [getTrackSectionsByIds, infraId, trackSectionsLoading]
  );
  return <ScenarioContext.Provider value={providedContext}>{children}</ScenarioContext.Provider>;
};

export const useScenarioContext = () => {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error('useScenarioContext must be used within a ScenarioContextProvider');
  }
  return context;
};
