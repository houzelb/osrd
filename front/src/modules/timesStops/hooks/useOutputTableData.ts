import { useMemo } from 'react';

import { keyBy } from 'lodash';

import type {
  PathPropertiesFormatted,
  SimulationResponseSuccess,
} from 'applications/operationalStudies/types';
import type { TrainScheduleResult } from 'common/api/generatedEditoastApi';
import { formatSuggestedOperationalPoints } from 'modules/pathfinding/utils';
import type { OperationalPointWithTimeAndSpeed } from 'modules/trainschedule/components/DriverTrainScheduleV2/types';
import type { SuggestedOP } from 'modules/trainschedule/components/ManageTrainSchedule/types';
import { secToHoursString } from 'utils/timeManipulation';

import computeMargins from '../helpers/computeMargins';
import formatScheduleData from '../helpers/formatScheduleData';
import { findNextScheduledOpPoint } from '../helpers/utils';
import type { TrainScheduleBasePathWithUic, ScheduleEntry } from '../types';

function useOutputTableData(
  simulatedTrain: SimulationResponseSuccess,
  pathProperties: PathPropertiesFormatted,
  operationalPoints: OperationalPointWithTimeAndSpeed[],
  selectedTrainSchedule: TrainScheduleResult,
  pathLength?: number
) {
  const scheduleByAt: Record<string, ScheduleEntry> = keyBy(selectedTrainSchedule.schedule, 'at');
  const suggestedOperationalPoints: SuggestedOP[] = useMemo(
    () =>
      pathLength
        ? formatSuggestedOperationalPoints(
            pathProperties.operationalPoints,
            pathProperties.geometry,
            pathLength
          )
        : [],
    [pathProperties.operationalPoints, pathProperties.geometry]
  );

  const pathStepsWithOpPointIndices = useMemo(
    () =>
      selectedTrainSchedule.path
        .filter((pathStep): pathStep is TrainScheduleBasePathWithUic => 'uic' in pathStep)
        .map((pathStep) => {
          const correspondingOpPointIndex = suggestedOperationalPoints.findIndex(
            (sugOpPoint) =>
              'uic' in pathStep &&
              sugOpPoint.uic === pathStep.uic &&
              sugOpPoint.ch === pathStep.secondary_code
          );
          return {
            ...pathStep,
            correspondingOpPointIndex,
          };
        }),
    [selectedTrainSchedule, suggestedOperationalPoints]
  );
  const pathStepsByUic = keyBy(
    pathStepsWithOpPointIndices,
    (pathStep) => `${pathStep.uic}-${pathStep.secondary_code}`
  );
  const operationPointsByNameCh = keyBy(
    operationalPoints,
    (opPoint) => `${opPoint.name}-${opPoint.ch}`
  );

  const outputTableData = useMemo(
    () =>
      suggestedOperationalPoints.map((sugOpPoint, sugOpIndex) => {
        const opPoint = operationPointsByNameCh[`${sugOpPoint.name}-${sugOpPoint.ch}`];
        if (!opPoint) {
          return sugOpPoint;
        }
        const nextOpPoint = findNextScheduledOpPoint(
          operationalPoints,
          pathStepsWithOpPointIndices,
          sugOpIndex
        );
        const pathStepKey = `${sugOpPoint.uic}-${sugOpPoint.ch}`;

        if (pathStepKey in pathStepsByUic && nextOpPoint) {
          const pathStepId = pathStepsByUic[pathStepKey].id || '';
          const schedule = scheduleByAt[pathStepId];
          const scheduleData = formatScheduleData(schedule, selectedTrainSchedule.start_time);
          const marginsData = computeMargins(
            simulatedTrain,
            opPoint,
            nextOpPoint,
            selectedTrainSchedule,
            pathStepId
          );
          return {
            ...sugOpPoint,
            ...scheduleData,
            onStopSignal: schedule?.on_stop_signal || '',
            calculatedArrival: secToHoursString(opPoint.time, true),
            calculatedDeparture:
              opPoint.duration > 0 ? secToHoursString(opPoint.time + opPoint.duration, true) : '',
            ...marginsData,
          } as SuggestedOP;
        }

        return { ...sugOpPoint, calculatedArrival: secToHoursString(opPoint.time, true) };
      }),
    [simulatedTrain, pathProperties, operationalPoints, selectedTrainSchedule, pathLength]
  );
  return outputTableData;
}
export default useOutputTableData;
