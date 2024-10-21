import { useState } from 'react';

import { useSelector } from 'react-redux';

import { STDCM_TRAIN_ID } from 'applications/stdcm/consts';
import useProjectedTrainsForStdcm from 'applications/stdcm/hooks/useProjectedTrainsForStdcm';
import type { StdcmResultsOutput } from 'applications/stdcm/types';
import { osrdEditoastApi, type TrackRange } from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import i18n from 'i18n';
import ManchetteWithSpaceTimeChartWrapper from 'modules/simulationResult/components/ManchetteWithSpaceTimeChart/ManchetteWithSpaceTimeChart';
import SpeedSpaceChartContainer from 'modules/simulationResult/components/SpeedSpaceChart/SpeedSpaceChartContainer';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';

const SPEED_SPACE_CHART_HEIGHT = 521.5;
const HANDLE_TAB_RESIZE_HEIGHT = 20;

type StdcmDebugResultsProps = {
  pathTrackRanges: TrackRange[];
  simulationOutputs: StdcmResultsOutput;
};

const StdcmDebugResults = ({
  pathTrackRanges,
  simulationOutputs: { pathProperties, results, speedSpaceChartData },
}: StdcmDebugResultsProps) => {
  const { getWorkScheduleGroupId } = useOsrdConfSelectors() as StdcmConfSelectors;
  const workScheduleGroupId = useSelector(getWorkScheduleGroupId);

  const [speedSpaceChartContainerHeight, setSpeedSpaceChartContainerHeight] =
    useState(SPEED_SPACE_CHART_HEIGHT);
  const tWithoutPrefix = i18n.getFixedT(null, 'stdcm');

  const spaceTimeData = useProjectedTrainsForStdcm(results);

  const { data: workSchedules } = osrdEditoastApi.endpoints.postWorkSchedulesProjectPath.useQuery(
    {
      body: {
        path_track_ranges: pathTrackRanges,
        work_schedule_group_id: workScheduleGroupId!,
      },
    },
    { skip: !workScheduleGroupId }
  );

  return (
    <>
      {spaceTimeData && spaceTimeData.length > 0 && pathProperties.manchetteOperationalPoints && (
        <div className="osrd-simulation-container mb-2">
          <p className="mt-2 mb-3 ml-4 font-weight-bold">{tWithoutPrefix('spaceTimeGraphic')}</p>
          <div className="chart-container mt-2">
            <ManchetteWithSpaceTimeChartWrapper
              operationalPoints={pathProperties.manchetteOperationalPoints}
              projectPathTrainResult={spaceTimeData}
              selectedTrainScheduleId={STDCM_TRAIN_ID}
              workSchedules={workSchedules}
            />
          </div>
        </div>
      )}

      <div className="osrd-simulation-container my-2 speedspacechart-container">
        <div
          className="chart-container"
          style={{
            height: `${speedSpaceChartContainerHeight + HANDLE_TAB_RESIZE_HEIGHT}px`,
          }}
        >
          <SpeedSpaceChartContainer
            trainSimulation={results.simulation}
            selectedTrainPowerRestrictions={speedSpaceChartData.formattedPowerRestrictions}
            pathProperties={speedSpaceChartData.formattedPathProperties}
            heightOfSpeedSpaceChartContainer={speedSpaceChartContainerHeight}
            setHeightOfSpeedSpaceChartContainer={setSpeedSpaceChartContainerHeight}
            rollingStock={speedSpaceChartData.rollingStock}
          />
        </div>
      </div>
    </>
  );
};

export default StdcmDebugResults;
