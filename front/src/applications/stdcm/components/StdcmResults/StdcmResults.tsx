import { useMemo, useState } from 'react';

import { Button } from '@osrd-project/ui-core';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useTranslation } from 'react-i18next';

import type { StdcmSimulation } from 'applications/stdcm/types';
import {
  generateCodeNumber,
  getOperationalPointsWithTimes,
} from 'applications/stdcm/utils/formatSimulationReportSheet';
import { type TrackRange } from 'common/api/osrdEditoastApi';
import { Map } from 'modules/trainschedule/components/ManageTrainSchedule';

import SimulationReportSheet from './SimulationReportSheet';
import StdcmDebugResults from './StdcmDebugResults';
import StcdmResultsTable from './StdcmResultsTable';
import StdcmSimulationNavigator from './StdcmSimulationNavigator';

type StcdmResultsProps = {
  isCalculationFailed: boolean;
  isDebugMode: boolean;
  onRetainSimulation: () => void;
  onSelectSimulation: (simulationIndex: number) => void;
  onStartNewQuery: () => void;
  retainedSimulationIndex: number;
  selectedSimulationIndex: number;
  showStatusBanner: boolean;
  simulationsList: StdcmSimulation[];
  pathTrackRanges?: TrackRange[];
};

const StcdmResults = ({
  isCalculationFailed,
  isDebugMode,
  onRetainSimulation,
  onSelectSimulation,
  onStartNewQuery,
  retainedSimulationIndex,
  selectedSimulationIndex,
  showStatusBanner,
  simulationsList,
  pathTrackRanges,
}: StcdmResultsProps) => {
  const { t } = useTranslation('stdcm', { keyPrefix: 'simulation.results' });

  const [mapCanvas, setMapCanvas] = useState<string>();

  const selectedSimulation = simulationsList[selectedSimulationIndex];
  const simulationReportSheetNumber = generateCodeNumber();

  const isSelectedSimulationRetained = selectedSimulationIndex === retainedSimulationIndex;

  const operationalPointsList = useMemo(() => {
    if (!selectedSimulation || !selectedSimulation.outputs) {
      return [];
    }

    return getOperationalPointsWithTimes(
      selectedSimulation.outputs.pathProperties?.suggestedOperationalPoints || [],
      selectedSimulation.outputs.results.simulation,
      selectedSimulation.outputs.results.departure_time
    );
  }, [selectedSimulation]);

  return (
    <>
      <StdcmSimulationNavigator
        simulationsList={simulationsList}
        selectedSimulationIndex={selectedSimulationIndex}
        showStatusBanner={showStatusBanner}
        isCalculationFailed={isCalculationFailed}
        onSelectSimulation={onSelectSimulation}
        retainedSimulationIndex={retainedSimulationIndex}
      />
      <div className="simulation-results">
        {selectedSimulation.outputs ? (
          <div className="results-and-sheet">
            <StcdmResultsTable
              stdcmData={selectedSimulation.outputs.results}
              isSimulationRetained={isSelectedSimulationRetained}
              operationalPointsList={operationalPointsList}
              onRetainSimulation={onRetainSimulation}
            />
            {isSelectedSimulationRetained && (
              <div className="get-simulation">
                <div className="download-simulation">
                  <PDFDownloadLink
                    document={
                      <SimulationReportSheet
                        stdcmData={selectedSimulation.outputs.results}
                        simulationReportSheetNumber={simulationReportSheetNumber}
                        mapCanvas={mapCanvas}
                        operationalPointsList={operationalPointsList}
                      />
                    }
                    fileName={`STDCM-${simulationReportSheetNumber}.pdf`}
                  >
                    <Button label={t('downloadSimulationSheet')} onClick={() => {}} />
                  </PDFDownloadLink>
                </div>
                <div className="gesico-text">{t('gesicoRequest')}</div>
              </div>
            )}
            {retainedSimulationIndex > -1 && (
              <div className="start-new-query">
                <Button variant="Normal" label={t('startNewQuery')} onClick={onStartNewQuery} />
              </div>
            )}
          </div>
        ) : (
          <div className="simulation-failure">
            <span className="title">{t('notFound')}</span>
            <span className="change-criteria">{t('changeCriteria')}</span>
          </div>
        )}
        <div className="osrd-config-item-container osrd-config-item-container-map map-results no-pointer-events">
          <Map
            mapId="map-result"
            isReadOnly
            hideAttribution
            showStdcmAssets
            setMapCanvas={setMapCanvas}
            pathGeometry={selectedSimulation.outputs?.pathProperties.geometry}
            simulationPathSteps={selectedSimulation.outputs?.results.simulationPathSteps}
          />
        </div>
      </div>
      {isDebugMode && pathTrackRanges && selectedSimulation.outputs && (
        <StdcmDebugResults
          pathTrackRanges={pathTrackRanges}
          simulationOutputs={selectedSimulation.outputs}
        />
      )}
    </>
  );
};

export default StcdmResults;
