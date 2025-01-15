import { useEffect, useState } from 'react';

import { omit } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { upsertMapWaypointsInOperationalPoints } from 'applications/operationalStudies/helpers/upsertMapWaypointsInOperationalPoints';
import type { OperationalPoint } from 'applications/operationalStudies/types';
import { STDCM_TRAIN_ID } from 'applications/stdcm/consts';
import {
  osrdEditoastApi,
  type PathProperties,
  type TrainScheduleResult,
} from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';

const useGetProjectedTrainOperationalPoints = (
  trainScheduleUsedForProjection?: TrainScheduleResult,
  trainIdUsedForProjection?: number,
  infraId?: number
) => {
  const { t } = useTranslation('simulation');
  const { getTimetableID } = useOsrdConfSelectors();
  const timetableId = useSelector(getTimetableID);

  const [operationalPoints, setOperationalPoints] = useState<OperationalPoint[]>([]);
  const [filteredOperationalPoints, setFilteredOperationalPoints] =
    useState<OperationalPoint[]>(operationalPoints);

  const { data: pathfindingResult } = osrdEditoastApi.endpoints.getTrainScheduleByIdPath.useQuery(
    {
      id: trainIdUsedForProjection!,
      infraId: infraId!,
    },
    {
      skip: !trainIdUsedForProjection || !infraId || trainIdUsedForProjection === STDCM_TRAIN_ID,
    }
  );

  const [postPathProperties] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathProperties.useLazyQuery();

  useEffect(() => {
    const getOperationalPoints = async () => {
      if (infraId && trainScheduleUsedForProjection && pathfindingResult?.status === 'success') {
        const { operational_points } = await postPathProperties({
          infraId,
          props: ['operational_points'],
          pathPropertiesInput: {
            track_section_ranges: pathfindingResult.track_section_ranges,
          },
        }).unwrap();

        const operationalPointsWithAllWaypoints = upsertMapWaypointsInOperationalPoints(
          trainScheduleUsedForProjection.path,
          pathfindingResult.path_item_positions,
          operational_points!,
          t
        );
        let operationalPointsWithUniqueIds = operationalPointsWithAllWaypoints.map((op, i) => ({
          ...op,
          id: `${op.id}-${op.position}-${i}`,
        }));

        const matchingIndexes = pathfindingResult.path_item_positions.map((itemPosition) =>
          operationalPointsWithAllWaypoints
            .map((op) => op.position)
            ?.findIndex((position) => position === itemPosition)
        );

        const operationalPointsWithWeightedVias = operationalPointsWithAllWaypoints.map(
          (op, index) => {
            if (matchingIndexes.includes(index)) {
              return { ...op, weight: 100 };
            }
            return op;
          }
        );

        setOperationalPoints(operationalPointsWithUniqueIds);

        // Check if there are saved manchettes in localStorage for the current timetable and path
        const simplifiedPath = trainScheduleUsedForProjection.path.map((waypoint) =>
          omit(waypoint, ['id', 'deleted'])
        );
        const stringifiedSavedWaypoints = localStorage.getItem(
          `${timetableId}-${JSON.stringify(simplifiedPath)}`
        );
        if (stringifiedSavedWaypoints) {
          operationalPointsWithUniqueIds = JSON.parse(stringifiedSavedWaypoints) as NonNullable<
            PathProperties['operational_points']
          >;
        }
        setFilteredOperationalPoints(operationalPointsWithWeightedVias);
      }
    };
    getOperationalPoints();
  }, [pathfindingResult, infraId, t]);

  return { operationalPoints, filteredOperationalPoints, setFilteredOperationalPoints };
};

export default useGetProjectedTrainOperationalPoints;
