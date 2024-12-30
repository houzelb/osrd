import type { Position } from 'geojson';

import type {
  AllowanceValue,
  ArrivalTimeTypes,
  LinkedTrains,
  StdcmStopTypes,
} from 'applications/stdcm/types';
import type {
  OperationalPointReference,
  PathItemLocation,
  ReceptionSignal,
} from 'common/api/osrdEditoastApi';
import type { IsoDurationString } from 'common/types';
import type { InfraState } from 'reducers/infra';

export type OsrdConfState = InfraState & {
  projectID?: number;
  studyID?: number;
  scenarioID?: number;
  timetableID?: number;
  electricalProfileSetId?: number;
  workScheduleGroupId?: number;
  temporarySpeedLimitGroupId?: number;
  searchDatetimeWindow?: { begin: Date; end: Date };
  rollingStockID?: number;
  speedLimitByTag?: string;
  gridMarginBefore?: number;
  gridMarginAfter?: number;
};

export interface StandardAllowance {
  type: AllowanceValue['value_type'];
  value?: number;
}

export type OsrdStdcmConfState = OsrdConfState & {
  stdcmPathSteps: StdcmPathStep[];
  standardStdcmAllowance?: StandardAllowance;
  totalMass?: number;
  totalLength?: number;
  maxSpeed?: number;
  towedRollingStockID?: number;
  linkedTrains: LinkedTrains;
};

export type PathStep = PathItemLocation & {
  id: string;
  /** Metadata given to mark a point as wishing to be deleted by the user.
        It's useful for soft deleting the point (waiting to fix / remove all references)
        If true, the train schedule is consider as invalid and must be edited */
  deleted?: boolean;
  arrival?: IsoDurationString | null;
  locked?: boolean;
  stopFor?: string | null;
  theoreticalMargin?: string;
  receptionSignal?: ReceptionSignal;
  kp?: string;
  /** Distance from the beginning of the path in mm */
  positionOnPath?: number;
  coordinates?: Position;
  // Metadatas given by the search endpoint in TypeAndPath (name)
  name?: string;
  // Metadatas given by ManageTrainScheduleMap click event to add origin/destination/via
  metadata?: {
    lineCode: number;
    lineName: string;
    trackName: string;
    trackNumber: number;
  };
  isInvalid?: boolean;
};

export type StdcmPathStep = {
  id: string;
  location?: Extract<OperationalPointReference, { uic: number }> & {
    secondary_code: string;
    name: string;
    coordinates: [number, number];
  };
} & (
  | { isVia: true; stopType: StdcmStopTypes; stopFor?: number /* in minutes */ }
  | {
      isVia: false;
      arrivalType: ArrivalTimeTypes;
      arrival?: Date;
      tolerances?: { before: number; after: number };
    }
);
