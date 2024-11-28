import { useEffect, useMemo } from 'react';

import { useSelector } from 'react-redux';

import type { StdcmPathProperties, StdcmResponse } from 'applications/stdcm/types';
import {
  osrdEditoastApi,
  type PathfindingResultSuccess,
  type PostInfraByInfraIdPathPropertiesApiArg,
  type TrainScheduleResult,
} from 'common/api/osrdEditoastApi';
import { useInfraID } from 'common/osrdContext';
import { formatSuggestedOperationalPoints } from 'modules/pathfinding/utils';
import useSpeedSpaceChart from 'modules/simulationResult/components/SpeedSpaceChart/useSpeedSpaceChart';
import type { SuggestedOP } from 'modules/trainschedule/components/ManageTrainSchedule/types';
import { getSelectedTrainId } from 'reducers/simulationResults/selectors';

import { STDCM_TRAIN_ID } from '../consts';

const useStdcmResults = (
  stdcmResponse: StdcmResponse | undefined,
  stdcmTrainResult: TrainScheduleResult | undefined,
  setPathProperties: (pathProperties?: StdcmPathProperties) => void
) => {
  const infraId = useInfraID();
  const selectedTrainId = useSelector(getSelectedTrainId);

  const [postPathProperties] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathProperties.useLazyQuery();

  const { data: otherSelectedTrainSchedule } =
    osrdEditoastApi.endpoints.getTrainScheduleById.useQuery(
      { id: selectedTrainId! },
      { skip: !selectedTrainId || selectedTrainId === STDCM_TRAIN_ID }
    );

  const selectedTrainSchedule = useMemo(
    () =>
      selectedTrainId !== STDCM_TRAIN_ID && otherSelectedTrainSchedule
        ? otherSelectedTrainSchedule
        : stdcmTrainResult,
    [selectedTrainId, stdcmTrainResult, otherSelectedTrainSchedule]
  );

  const { simulation, departure_time: departureTime } =
    stdcmResponse?.status === 'success'
      ? stdcmResponse
      : { simulation: undefined, departure_time: undefined };

  const speedSpaceChartData = useSpeedSpaceChart(
    stdcmTrainResult,
    stdcmResponse?.path,
    simulation,
    departureTime
  );

  useEffect(() => {
    const getPathProperties = async (_infraId: number, path: PathfindingResultSuccess) => {
      const pathPropertiesParams: PostInfraByInfraIdPathPropertiesApiArg = {
        infraId: _infraId,
        props: ['geometry', 'operational_points', 'zones'],
        pathPropertiesInput: {
          track_section_ranges: path.track_section_ranges,
        },
      };
      const { geometry, operational_points, zones } =
        await postPathProperties(pathPropertiesParams).unwrap();

      if (geometry && operational_points && zones) {
        const operationalPointsWithUniqueIds = operational_points.map((op, index) => ({
          ...op,
          id: `${op.id}-${op.position}-${index}`,
        }));

        const suggestedOperationalPoints: SuggestedOP[] = formatSuggestedOperationalPoints(
          operational_points,
          geometry,
          path.length
        );

        setPathProperties({
          manchetteOperationalPoints: operationalPointsWithUniqueIds,
          geometry,
          suggestedOperationalPoints,
          zones,
        });
      }
    };

    if (infraId && stdcmResponse && stdcmResponse?.path) {
      getPathProperties(infraId, stdcmResponse.path);
    }
  }, [stdcmResponse]);

  if (!infraId || !stdcmResponse || !selectedTrainSchedule) return null;

  return {
    stdcmResponse,
    speedSpaceChartData,
  };
};

export default useStdcmResults;
