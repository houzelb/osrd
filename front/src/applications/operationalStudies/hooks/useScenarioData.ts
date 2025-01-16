import { useCallback, useEffect, useMemo, useState } from 'react';

import { keyBy, sortBy } from 'lodash';
import { useSelector } from 'react-redux';

import {
  osrdEditoastApi,
  type InfraWithState,
  type ScenarioResponse,
  type TimetableDetailedResult,
  type TrainScheduleResult,
} from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import { getTrainIdUsedForProjection } from 'reducers/simulationResults/selectors';
import { mapBy } from 'utils/types';

import useAutoUpdateProjection from './useAutoUpdateProjection';
import useLazyLoadTrains from './useLazyLoadTrains';
import usePathProjection from './usePathProjection';
import formatTrainScheduleSummaries from '../helpers/formatTrainScheduleSummaries';

const useScenarioData = (
  scenario: ScenarioResponse,
  timetable: TimetableDetailedResult,
  infra: InfraWithState
) => {
  const { getElectricalProfileSetId } = useOsrdConfSelectors();
  const electricalProfileSetId = useSelector(getElectricalProfileSetId);
  const trainIdUsedForProjection = useSelector(getTrainIdUsedForProjection);

  const [trainSchedules, setTrainSchedules] = useState<TrainScheduleResult[]>();
  const [trainIdsToFetch, setTrainIdsToFetch] = useState<number[]>();

  const [fetchTrainSchedules] = osrdEditoastApi.endpoints.postTrainSchedule.useLazyQuery();
  const [putTrainScheduleById] = osrdEditoastApi.endpoints.putTrainScheduleById.useMutation();
  const [postTrainScheduleSimulationSummary] =
    osrdEditoastApi.endpoints.postTrainScheduleSimulationSummary.useLazyQuery();
  const { data: { results: rollingStocks } = { results: null } } =
    osrdEditoastApi.endpoints.getLightRollingStock.useQuery({ pageSize: 1000 });

  const projectionPath = usePathProjection(infra);

  const {
    trainScheduleSummariesById,
    projectedTrainsById,
    setTrainScheduleSummariesById,
    setProjectedTrainsById,
    allTrainsProjected,
    allTrainsLoaded,
  } = useLazyLoadTrains({
    infraId: scenario.infra_id,
    trainIdsToFetch,
    setTrainIdsToFetch,
    path: projectionPath?.path,
    trainSchedules,
  });

  const { data: conflicts, refetch: refetchConflicts } =
    osrdEditoastApi.endpoints.getTimetableByIdConflicts.useQuery(
      {
        id: scenario.timetable_id,
        infraId: scenario.infra_id,
      },
      {
        skip: !allTrainsLoaded,
      }
    );

  const trainScheduleSummaries = useMemo(
    () => sortBy(Array.from(trainScheduleSummariesById.values()), 'startTime'),
    [trainScheduleSummariesById]
  );

  const projectedTrains = useMemo(
    () => Array.from(projectedTrainsById.values()),
    [projectedTrainsById]
  );

  const trainScheduleUsedForProjection = useMemo(
    () => trainSchedules?.find((trainSchedule) => trainSchedule.id === trainIdUsedForProjection),
    [trainIdUsedForProjection, trainSchedules]
  );

  useAutoUpdateProjection(infra, timetable.train_ids, trainScheduleSummaries);

  useEffect(() => {
    const fetchTrains = async () => {
      const rawTrainSchedules = await fetchTrainSchedules({
        body: {
          ids: timetable.train_ids,
        },
      }).unwrap();
      const sortedTrainSchedules = sortBy(rawTrainSchedules, 'start_time');
      setTrainSchedules(sortedTrainSchedules);
    };

    fetchTrains();
  }, []);

  // first load of the trainScheduleSummaries
  useEffect(() => {
    if (trainSchedules && infra.state === 'CACHED' && trainScheduleSummaries.length === 0) {
      const trainIds = trainSchedules.map((trainSchedule) => trainSchedule.id);
      setTrainIdsToFetch(trainIds);
    }
  }, [trainSchedules, infra.state]);

  const upsertTrainSchedules = useCallback(
    (trainSchedulesToUpsert: TrainScheduleResult[]) => {
      setProjectedTrainsById((prev) => {
        const newProjectedTrainsById = new Map(prev);
        trainSchedulesToUpsert.forEach((trainSchedule) => {
          newProjectedTrainsById.delete(trainSchedule.id);
        });
        return newProjectedTrainsById;
      });

      setTrainSchedules((prev) => {
        const newTrainSchedulesById = {
          ...keyBy(prev, 'id'),
          ...keyBy(trainSchedulesToUpsert, 'id'),
        };
        return sortBy(Object.values(newTrainSchedulesById), 'start_time');
      });

      const sortedTrainSchedulesToUpsert = sortBy(trainSchedulesToUpsert, 'start_time');
      setTrainIdsToFetch(sortedTrainSchedulesToUpsert.map((trainSchedule) => trainSchedule.id));
    },
    [trainSchedules]
  );

  const removeTrains = useCallback((_trainIdsToRemove: number[]) => {
    setTrainSchedules((prev) => {
      const trainSchedulesById = mapBy(prev, 'id');
      _trainIdsToRemove.forEach((trainId) => {
        trainSchedulesById.delete(trainId);
      });
      return Array.from(trainSchedulesById.values());
    });

    setTrainScheduleSummariesById((prev) => {
      const newTrainScheduleSummariesById = new Map(prev);
      _trainIdsToRemove.forEach((trainId) => {
        newTrainScheduleSummariesById.delete(trainId);
      });
      return newTrainScheduleSummariesById;
    });

    setProjectedTrainsById((prev) => {
      const newProjectedTrainsById = new Map(prev);
      _trainIdsToRemove.forEach((trainId) => {
        newProjectedTrainsById.delete(trainId);
      });
      return newProjectedTrainsById;
    });
  }, []);

  /** Update only depature time of a train */
  const updateTrainDepartureTime = useCallback(
    async (trainId: number, newDeparture: Date) => {
      const trainSchedule = trainSchedules?.find((train) => train.id === trainId);

      if (!trainSchedule) {
        throw new Error('Train non trouvé');
      }

      const trainScheduleResult = await putTrainScheduleById({
        id: trainId,
        trainScheduleForm: {
          ...trainSchedule,
          start_time: newDeparture.toISOString(),
        },
      }).unwrap();

      setProjectedTrainsById((prev) => {
        const newProjectedTrainsById = new Map(prev);
        newProjectedTrainsById.set(trainScheduleResult.id, {
          ...newProjectedTrainsById.get(trainScheduleResult.id)!,
          departureTime: newDeparture,
        });
        return newProjectedTrainsById;
      });

      setTrainSchedules((prev) => {
        const newTrainSchedulesById = {
          ...keyBy(prev, 'id'),
          ...keyBy([trainScheduleResult], 'id'),
        };
        return sortBy(Object.values(newTrainSchedulesById), 'start_time');
      });

      // update its summary
      const rawSummaries = await postTrainScheduleSimulationSummary({
        body: {
          infra_id: scenario.infra_id,
          ids: [trainId],
          electrical_profile_set_id: electricalProfileSetId,
        },
      }).unwrap();
      const summaries = formatTrainScheduleSummaries(
        [trainId],
        rawSummaries,
        mapBy([trainScheduleResult], 'id'),
        rollingStocks!
      );
      setTrainScheduleSummariesById((prev) => {
        const newTrainScheduleSummariesById = new Map(prev);
        newTrainScheduleSummariesById.set(trainId, summaries.get(trainId)!);
        return newTrainScheduleSummariesById;
      });

      // fetch conflicts
      refetchConflicts();
    },
    [trainSchedules, rollingStocks]
  );

  const results = useMemo(
    () => ({
      trainScheduleSummaries,
      trainSchedules,
      projectionData:
        trainScheduleUsedForProjection && projectionPath
          ? {
              trainSchedule: trainScheduleUsedForProjection,
              ...projectionPath,
              projectedTrains,
              projectionLoaderData: {
                allTrainsProjected,
                totalTrains: timetable.train_ids.length,
              },
            }
          : undefined,
      conflicts,
      removeTrains,
      upsertTrainSchedules,
      updateTrainDepartureTime,
    }),
    [
      trainScheduleSummaries,
      trainSchedules,
      trainScheduleUsedForProjection,
      projectionPath,
      projectedTrains,
      allTrainsProjected,
      timetable.train_ids.length,
      conflicts,
      removeTrains,
      upsertTrainSchedules,
      updateTrainDepartureTime,
    ]
  );

  return results;
};

export default useScenarioData;
