import { useMemo, useRef, useState } from 'react';

import { KebabHorizontal } from '@osrd-project/ui-icons';
import { Manchette } from '@osrd-project/ui-manchette';
import { useManchettesWithSpaceTimeChart } from '@osrd-project/ui-manchette-with-spacetimechart';
import {
  ConflictLayer,
  PathLayer,
  SpaceTimeChart,
  WorkScheduleLayer,
  OccupancyBlockLayer,
} from '@osrd-project/ui-spacetimechart';
import type { Conflict } from '@osrd-project/ui-spacetimechart';
import { compact } from 'lodash';

import type { OperationalPoint, TrainSpaceTimeData } from 'applications/operationalStudies/types';
import upward from 'assets/pictures/workSchedules/ScheduledMaintenanceUp.svg';
import type { PostWorkSchedulesProjectPathApiResponse } from 'common/api/osrdEditoastApi';
import cutSpaceTimeRect from 'modules/simulationResult/components/SpaceTimeChart/helpers/utils';
import { ASPECT_LABELS_COLORS } from 'modules/simulationResult/consts';
import type {
  AspectLabel,
  LayerRangeData,
  WaypointsPanelData,
} from 'modules/simulationResult/types';

import SettingsPanel from './SettingsPanel';
import ManchetteMenuButton from '../SpaceTimeChart/ManchetteMenuButton';
import ProjectionLoadingMessage from '../SpaceTimeChart/ProjectionLoadingMessage';
import WaypointsPanel from '../SpaceTimeChart/WaypointsPanel';

type ManchetteWithSpaceTimeChartProps = {
  operationalPoints: OperationalPoint[];
  projectPathTrainResult: TrainSpaceTimeData[];
  selectedTrainScheduleId?: number;
  waypointsPanelData?: WaypointsPanelData;
  conflicts?: Conflict[];
  workSchedules?: PostWorkSchedulesProjectPathApiResponse;
  projectionLoaderData: {
    totalTrains: number;
    allTrainsProjected: boolean;
  };
};
const DEFAULT_HEIGHT = 561;

const ManchetteWithSpaceTimeChartWrapper = ({
  operationalPoints,
  projectPathTrainResult,
  selectedTrainScheduleId,
  waypointsPanelData,
  conflicts = [],
  workSchedules,
  projectionLoaderData: { totalTrains, allTrainsProjected },
}: ManchetteWithSpaceTimeChartProps) => {
  const [heightOfManchetteWithSpaceTimeChart] = useState(DEFAULT_HEIGHT);
  const manchetteWithSpaceTimeChartRef = useRef<HTMLDivElement>(null);

  const [waypointsPanelIsOpen, setWaypointsPanelIsOpen] = useState(false);

  // Cut the space time chart curves if the first or last waypoints are hidden
  const { filteredProjectPathTrainResult: cutProjectedTrains, filteredConflicts: cutConflicts } =
    useMemo(() => {
      let filteredProjectPathTrainResult = projectPathTrainResult;
      let filteredConflicts = conflicts;

      if (!waypointsPanelData || waypointsPanelData.filteredWaypoints.length < 2)
        return { filteredProjectPathTrainResult, filteredConflicts };

      const { filteredWaypoints } = waypointsPanelData;
      const firstPosition = filteredWaypoints.at(0)!.position;
      const lastPosition = filteredWaypoints.at(-1)!.position;

      if (firstPosition !== 0 || lastPosition !== operationalPoints.at(-1)!.position) {
        filteredProjectPathTrainResult = projectPathTrainResult.map((train) => ({
          ...train,
          spaceTimeCurves: train.spaceTimeCurves.map(({ positions, times }) => {
            const cutPositions: number[] = [];
            const cutTimes: number[] = [];

            for (let i = 1; i < positions.length; i += 1) {
              const currentRange: LayerRangeData = {
                spaceStart: positions[i - 1],
                spaceEnd: positions[i],
                timeStart: times[i - 1],
                timeEnd: times[i],
              };

              const interpolatedRange = cutSpaceTimeRect(currentRange, firstPosition, lastPosition);

              // TODO : remove reformatting the datas when https://github.com/OpenRailAssociation/osrd-ui/issues/694 is merged
              if (!interpolatedRange) continue;

              if (i === 1 || cutPositions.length === 0) {
                cutPositions.push(interpolatedRange.spaceStart);
                cutTimes.push(interpolatedRange.timeStart);
              }
              cutPositions.push(interpolatedRange.spaceEnd);
              cutTimes.push(interpolatedRange.timeEnd);
            }

            return {
              positions: cutPositions,
              times: cutTimes,
            };
          }),
          signalUpdates: compact(
            train.signalUpdates.map((signal) => {
              const updatedSignalRange = cutSpaceTimeRect(
                {
                  spaceStart: signal.position_start,
                  spaceEnd: signal.position_end,
                  timeStart: signal.time_start,
                  timeEnd: signal.time_end,
                },
                firstPosition,
                lastPosition
              );

              if (!updatedSignalRange) return null;

              // TODO : remove reformatting the datas when https://github.com/OpenRailAssociation/osrd-ui/issues/694 is merged
              return {
                ...signal,
                position_start: updatedSignalRange.spaceStart,
                position_end: updatedSignalRange.spaceEnd,
                time_start: updatedSignalRange.timeStart,
                time_end: updatedSignalRange.timeEnd,
              };
            })
          ),
        }));

        filteredConflicts = compact(
          conflicts.map((conflict) => cutSpaceTimeRect(conflict, firstPosition, lastPosition))
        );

        return { filteredProjectPathTrainResult, filteredConflicts };
      }

      return { filteredProjectPathTrainResult, filteredConflicts };
    }, [waypointsPanelData?.filteredWaypoints, projectPathTrainResult, conflicts]);

  const manchetteWaypoints = useMemo(() => {
    const rawWaypoints = waypointsPanelData?.filteredWaypoints ?? operationalPoints;
    return rawWaypoints.map((waypoint) => ({
      id: waypoint.id,
      position: waypoint.position,
      name: waypoint.extensions?.identifier?.name,
      secondaryCode: waypoint.extensions?.sncf?.ch,
    }));
  }, [waypointsPanelData, operationalPoints]);

  const { manchetteProps, spaceTimeChartProps, handleScroll } = useManchettesWithSpaceTimeChart(
    manchetteWaypoints,
    cutProjectedTrains,
    manchetteWithSpaceTimeChartRef,
    selectedTrainScheduleId
  );

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settings, setSettings] = useState({
    showConflicts: false,
    showSignalsStates: false,
  });

  const occupancyBlocks = cutProjectedTrains.flatMap((train) => {
    const departureTime = train.departureTime.getTime();

    return train.signalUpdates.map((block) => ({
      timeStart: departureTime + block.time_start,
      timeEnd: departureTime + block.time_end,
      spaceStart: block.position_start,
      spaceEnd: block.position_end,
      color: ASPECT_LABELS_COLORS[block.aspect_label as AspectLabel],
    }));
  });

  return (
    <div className="manchette-space-time-chart-wrapper">
      <div className="header">
        {waypointsPanelData && (
          <>
            <ManchetteMenuButton setWaypointsPanelIsOpen={setWaypointsPanelIsOpen} />
            {waypointsPanelIsOpen && (
              <WaypointsPanel
                waypointsPanelIsOpen={waypointsPanelIsOpen}
                setWaypointsPanelIsOpen={setWaypointsPanelIsOpen}
                waypoints={operationalPoints}
                waypointsPanelData={waypointsPanelData}
              />
            )}
          </>
        )}
        {!allTrainsProjected && (
          <ProjectionLoadingMessage
            projectedTrainsNb={projectPathTrainResult.length}
            totalTrains={totalTrains}
          />
        )}
      </div>
      <div className="header-separator" />
      <div
        ref={manchetteWithSpaceTimeChartRef}
        className="manchette flex"
        style={{ height: `${heightOfManchetteWithSpaceTimeChart}px` }}
        onScroll={handleScroll}
      >
        <Manchette {...manchetteProps} />
        <div
          className="space-time-chart-container"
          style={{
            bottom: 0,
            left: 0,
            top: 2,
            height: `${heightOfManchetteWithSpaceTimeChart - 6}px`,
          }}
        >
          <div className="toolbar">
            <button type="button" onClick={() => setShowSettingsPanel(true)}>
              <KebabHorizontal />
            </button>
          </div>
          {showSettingsPanel && (
            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              onClose={() => setShowSettingsPanel(false)}
            />
          )}
          <SpaceTimeChart
            className="inset-0 absolute h-full"
            spaceOrigin={
              (waypointsPanelData?.filteredWaypoints ?? operationalPoints).at(0)?.position || 0
            }
            timeOrigin={Math.min(...projectPathTrainResult.map((p) => +p.departureTime))}
            {...spaceTimeChartProps}
          >
            {spaceTimeChartProps.paths.map((path) => (
              <PathLayer key={path.id} path={path} color={path.color} />
            ))}
            {workSchedules && (
              <WorkScheduleLayer
                workSchedules={workSchedules.map((ws) => ({
                  type: ws.type,
                  timeStart: new Date(ws.start_date_time),
                  timeEnd: new Date(ws.end_date_time),
                  spaceRanges: ws.path_position_ranges.map(({ start, end }) => [start, end]),
                }))}
                imageUrl={upward}
              />
            )}
            {settings.showConflicts && <ConflictLayer conflicts={cutConflicts} />}
            {settings.showSignalsStates && (
              <OccupancyBlockLayer occupancyBlocks={occupancyBlocks} />
            )}
          </SpaceTimeChart>
        </div>
      </div>
    </div>
  );
};

export default ManchetteWithSpaceTimeChartWrapper;
