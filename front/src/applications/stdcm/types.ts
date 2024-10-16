import type {
  ManageTrainSchedulePathProperties,
  TrainSpaceTimeData,
} from 'applications/operationalStudies/types';
import type { STDCM_REQUEST_STATUS } from 'applications/stdcm/consts';
import type {
  GeoJsonPoint,
  LightRollingStock,
  PostTimetableByIdStdcmApiResponse,
  RollingStockWithLiveries,
  SimulationResponse,
  TowedRollingStock,
} from 'common/api/osrdEditoastApi';
import type { SpeedSpaceChartData } from 'modules/simulationResult/types';
import type { PathStep } from 'reducers/osrdconf/types';
import type { ValueOf } from 'utils/types';

export type StdcmRequestStatus = ValueOf<typeof STDCM_REQUEST_STATUS>;

export type StdcmSuccessResponse = Omit<
  Extract<PostTimetableByIdStdcmApiResponse, { status: 'success' }>,
  'simulation'
> & {
  simulation: Extract<SimulationResponse, { status: 'success' }>;
  rollingStock: LightRollingStock;
  creationDate: Date;
  speedLimitByTag?: string;
  simulationPathSteps: PathStep[];
};

export type SimulationReportSheetProps = {
  stdcmLinkedPaths: LinkedPaths;
  stdcmData: StdcmSuccessResponse;
  consist: StdcmSimulationInputs['consist'];
  simulationReportSheetNumber: string;
  mapCanvas?: string;
  operationalPointsList: StdcmResultsOperationalPointsList;
};

export type StdcmResultsOperationalPointsList = StdcmResultsOperationalPoint[];

type StdcmResultsOperationalPoint = {
  opId: string;
  positionOnPath: number;
  time: string | null;
  name?: string;
  ch?: string;
  stop?: string | null;
  duration: number;
  departureTime: string;
  stopEndTime: string;
  trackName?: string;
};

export type StdcmResults = {
  stdcmResponse: StdcmSuccessResponse;
  speedSpaceChartData: SpeedSpaceChartData | null;
  spaceTimeData: TrainSpaceTimeData[] | null;
};

export type LinkedPaths = {
  anteriorPath?: {
    date: string;
    time: string;
    trainName: string;
  };
  posteriorPath?: {
    date: string;
    time: string;
    trainName: string;
  };
};

export type AllowanceValue =
  | {
      minutes: number;
      value_type: 'time_per_distance';
    }
  | {
      seconds: number;
      value_type: 'time';
    }
  | {
      percentage: number;
      value_type: 'percentage';
    };

export type StdcmSimulationInputs = {
  departureDate?: string;
  departureTime?: string;
  pathSteps: (PathStep | null)[];
  consist?: {
    tractionEngine?: RollingStockWithLiveries;
    towedRollingStock?: TowedRollingStock;
    /** In ton */
    totalMass?: number;
    /** In meters */
    totalLength?: number;
    /** In km/s */
    maxSpeed?: number;
    speedLimitByTag?: string;
  };
  linkedPaths: LinkedPaths;
};

export type StdcmSimulationOutputs = {
  results: StdcmSuccessResponse;
  pathProperties: ManageTrainSchedulePathProperties;
  speedSpaceChartData: SpeedSpaceChartData;
};

export type StdcmSimulation = {
  id: number;
  creationDate: Date;
  inputs: StdcmSimulationInputs;
  outputs?: StdcmSimulationOutputs;
};

/** This type is used for StdcmConsist, StdcmOrigin, StdcmDestination and StdcmVias components */
export type StdcmConfigCardProps = {
  disabled?: boolean;
};

export enum ArrivalTimeTypes {
  PRECISE_TIME = 'preciseTime',
  ASAP = 'asSoonAsPossible',
}

export enum StdcmConfigErrorTypes {
  INFRA_NOT_LOADED = 'infraNotLoaded',
  MISSING_LOCATION = 'missingLocation',
  PATHFINDING_FAILED = 'pathfindingFailed',
  BOTH_POINT_SCHEDULED = 'bothPointAreScheduled',
  NO_SCHEDULED_POINT = 'noScheduledPoint',
}

export type StdcmConfigErrors = {
  errorType: StdcmConfigErrorTypes;
  errorDetails?: { originTime: string; destinationTime: string };
};

export type ScheduleConstraint = {
  date: Date;
  hours: number;
  minutes: number;
};

export enum StdcmStopTypes {
  PASSAGE_TIME = 'passageTime',
  DRIVER_SWITCH = 'driverSwitch',
  SERVICE_STOP = 'serviceStop',
}

export type StdcmLinkedPathStep = {
  ch: string;
  date: string;
  geographic: GeoJsonPoint;
  isoArrivalTime: string;
  name: string;
  obj_id: string;
  time: string;
  trigram: string;
  uic: number;
};

export type StdcmLinkedPathResult = {
  destination: StdcmLinkedPathStep;
  origin: StdcmLinkedPathStep;
  trainName: string;
};

export type ExtremityPathStepType = 'origin' | 'destination';
