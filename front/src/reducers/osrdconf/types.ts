import type { Position } from 'geojson';

import type { PowerRestriction } from 'applications/operationalStudies/types';
import type {
  AllowanceValue,
  ArrivalTimeTypes,
  LinkedTrains,
  StdcmSearchDatetimeWindow,
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
  searchDatetimeWindow?: StdcmSearchDatetimeWindow;
  rollingStockID?: number;
  speedLimitByTag?: string;
  powerRestriction: PowerRestriction[];
  pathSteps: (PathStep | null)[];
};

export interface StandardAllowance {
  type: AllowanceValue['value_type'];
  value?: number;
}

export type OsrdStdcmConfState = OsrdConfState & {
  stdcmPathSteps: StdcmPathStep[];
  margins: {
    standardAllowance?: StandardAllowance;
    gridMarginBefore?: number;
    gridMarginAfter?: number;
  };
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
  /** Flag specifying whether the pathStep was created from the power restriction selector or not
   *
   * If true, the pathStep might be cleaned if its power restriction is removed (except if it has time, stop or margin constraints)
   *
   * This flag will only work if the user has not saved their change. Once the change is saved, the flag will be removed and the pathStep
   * will become permanent.
   */
  isFromPowerRestriction?: boolean;
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
      tolerances: { before: number; after: number };
    }
);
