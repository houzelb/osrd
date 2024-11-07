import type { TrainScheduleResult } from 'common/api/osrdEditoastApi';
import type { TrainScheduleWithDetails } from 'modules/trainschedule/components/Timetable/types';
import { ms2sec } from 'utils/timeManipulation';

import { formatDigitsAndUnit } from './utils';

function getTheoreticalMargin(selectedTrainSchedule: TrainScheduleResult, pathStepId: string) {
  if (selectedTrainSchedule.path.length === 0) {
    return undefined;
  }
  // pathStep is starting point => we take the first margin
  if (selectedTrainSchedule.path[0].id === pathStepId) {
    return selectedTrainSchedule.margins?.values[0];
  }
  const theoreticalMarginBoundaryIndex = selectedTrainSchedule.margins?.boundaries?.findIndex(
    (id) => id === pathStepId
  );
  if (
    theoreticalMarginBoundaryIndex === undefined ||
    theoreticalMarginBoundaryIndex < 0 ||
    theoreticalMarginBoundaryIndex > selectedTrainSchedule.margins!.values.length - 2
  ) {
    return undefined;
  }

  return selectedTrainSchedule.margins!.values[theoreticalMarginBoundaryIndex + 1];
}

function computeMargins(
  selectedTrainSchedule: TrainScheduleResult,
  pathStepIndex: number,
  pathItemTimes: NonNullable<TrainScheduleWithDetails['pathItemTimes']> // in ms
) {
  const { path, margins } = selectedTrainSchedule;
  if (
    !margins ||
    (margins.values.length === 1 && margins.values[0] === '0%') ||
    pathStepIndex === selectedTrainSchedule.path.length - 1
  ) {
    return {
      theoreticalMargin: undefined,
      theoreticalMarginSeconds: undefined,
      calculatedMargin: undefined,
      diffMargins: undefined,
    };
  }

  const pathStepId = path[pathStepIndex].id;
  const theoreticalMargin = getTheoreticalMargin(selectedTrainSchedule, pathStepId);

  // find the previous pathStep where margin was defined
  let prevIndex = 0;
  for (let index = 1; index < pathStepIndex; index += 1) {
    if (margins.boundaries.includes(path[index].id)) {
      prevIndex = index;
    }
  }

  // durations to go from the last pathStep with theorical margin to the next pathStep
  // base = no margin
  // provisional = margins
  // final = margins + requested arrival times
  const { base, provisional, final } = pathItemTimes;
  const baseDuration = ms2sec(base[pathStepIndex + 1] - base[prevIndex]);
  const provisionalDuration = ms2sec(provisional[pathStepIndex + 1] - provisional[prevIndex]);
  const finalDuration = ms2sec(final[pathStepIndex + 1] - final[prevIndex]);

  // how much longer it took (s) with the margin than without
  const provisionalLostTime = provisionalDuration - baseDuration;
  const finalLostTime = finalDuration - baseDuration;

  return {
    theoreticalMargin: formatDigitsAndUnit(theoreticalMargin),
    theoreticalMarginSeconds: `${Math.round(provisionalLostTime)} s`,
    calculatedMargin: `${Math.round(finalLostTime)} s`,
    diffMargins: `${Math.round(finalLostTime - provisionalLostTime)} s`,
  };
}

export default computeMargins;
