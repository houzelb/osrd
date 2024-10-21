import type {
  StdcmSimulationOutputs,
  StdcmSuccessResponse,
  StdcmPathProperties,
} from 'applications/stdcm/types';
import type { Conflict } from 'common/api/osrdEditoastApi';
import type { SpeedSpaceChartData } from 'modules/simulationResult/types';

export const hasResults = (
  outputs?: StdcmSimulationOutputs
): outputs is {
  pathProperties: StdcmPathProperties;
  results: StdcmSuccessResponse;
  speedSpaceChartData: SpeedSpaceChartData;
} => !!outputs && 'results' in outputs;

export const hasConflicts = (
  outputs?: StdcmSimulationOutputs
): outputs is { pathProperties: StdcmPathProperties; conflicts: Conflict[] } =>
  !!outputs && 'conflicts' in outputs;
