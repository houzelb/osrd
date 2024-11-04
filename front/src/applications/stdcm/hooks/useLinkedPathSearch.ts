import { useMemo, useState, useCallback, useEffect } from 'react';

import { compact } from 'lodash';
import { useSelector } from 'react-redux';

import type {
  PathItem,
  SearchQuery,
  SearchResultItemOperationalPoint,
  SearchResultItemTrainSchedule,
} from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useInfraID, useOsrdConfSelectors } from 'common/osrdContext';
import { isArrivalDateInSearchTimeWindow, isEqualDate } from 'utils/date';

import type { StdcmLinkedPathResult } from '../types';
import computeOpSchedules from '../utils/computeOpSchedules';

const useLinkedPathSearch = () => {
  const [postSearch] = osrdEditoastApi.endpoints.postSearch.useMutation();
  const [postTrainScheduleSimulationSummary] =
    osrdEditoastApi.endpoints.postTrainScheduleSimulationSummary.useLazyQuery();

  const { getTimetableID, getSearchDatetimeWindow } = useOsrdConfSelectors();

  const infraId = useInfraID();
  const timetableId = useSelector(getTimetableID);
  const searchDatetimeWindow = useSelector(getSearchDatetimeWindow);

  const selectableSlot = useMemo(() => {
    const startDate = searchDatetimeWindow ? new Date(searchDatetimeWindow.begin) : new Date();
    startDate.setUTCHours(0, 0, 0);
    return {
      start: startDate,
      end: searchDatetimeWindow?.end || startDate,
    };
  }, [searchDatetimeWindow]);

  const [displaySearchButton, setDisplaySearchButton] = useState(true);
  const [trainNameInput, setTrainNameInput] = useState('');
  const [linkedPathDate, setLinkedPathDate] = useState(selectableSlot.start);
  const [linkedPathResults, setLinkedPathResults] = useState<StdcmLinkedPathResult[]>();

  const getExtremityDetails = useCallback(
    async (pathItem: PathItem) => {
      if (!('operational_point' in pathItem) && !('uic' in pathItem)) return undefined;

      const pathItemQuery =
        'operational_point' in pathItem
          ? ['=', ['obj_id'], pathItem.operational_point]
          : ([
              'and',
              ['=', ['uic'], pathItem.uic],
              ['=', ['ch'], pathItem.secondary_code],
            ] as SearchQuery);

      try {
        const payloadOP = {
          object: 'operationalpoint',
          query: pathItemQuery,
        };
        const opDetails = (await postSearch({
          searchPayload: payloadOP,
          pageSize: 25,
        }).unwrap()) as SearchResultItemOperationalPoint[];
        return opDetails[0];
      } catch (error) {
        console.error('Failed to fetch operational point:', error);
        return undefined;
      }
    },
    [postSearch]
  );

  const getTrainsSummaries = useCallback(
    async (trainsIds: number[]) => {
      if (!infraId) return undefined;
      const trainsSummaries = await postTrainScheduleSimulationSummary({
        body: {
          infra_id: infraId,
          ids: trainsIds,
        },
      }).unwrap();
      return trainsSummaries;
    },
    [postTrainScheduleSimulationSummary, infraId]
  );

  const launchTrainScheduleSearch = useCallback(async () => {
    setLinkedPathResults(undefined);
    if (!trainNameInput) return;

    setDisplaySearchButton(false);
    try {
      const results = (await postSearch({
        searchPayload: {
          object: 'trainschedule',
          query: [
            'and',
            ['search', ['train_name'], trainNameInput],
            ['=', ['timetable_id'], timetableId!],
          ],
        },
        pageSize: 25,
      }).unwrap()) as SearchResultItemTrainSchedule[];
      const filteredResults = results.filter((result) =>
        isEqualDate(linkedPathDate, new Date(result.start_time))
      );

      if (!filteredResults.length) {
        setDisplaySearchButton(true);
        return;
      }

      const filteredResultsSummaries = await getTrainsSummaries(filteredResults.map((r) => r.id));

      const newLinkedPathResults = await Promise.all(
        filteredResults.map(async (result) => {
          const resultSummary = filteredResultsSummaries && filteredResultsSummaries[result.id];
          if (!resultSummary || resultSummary.status !== 'success') return undefined;
          const msFromStartTime = resultSummary.path_item_times_final.at(-1)!;

          const originDetails = await getExtremityDetails(result.path.at(0)!);
          const destinationDetails = await getExtremityDetails(result.path.at(-1)!);
          const computedOpSchedules = computeOpSchedules(result.start_time, msFromStartTime);

          if (!originDetails || !destinationDetails) return undefined;
          return {
            trainName: result.train_name,
            origin: { ...originDetails, ...computedOpSchedules.origin },
            destination: {
              ...destinationDetails,
              ...computedOpSchedules.destination,
            },
          };
        })
      );
      setLinkedPathResults(compact(newLinkedPathResults));
    } catch (error) {
      console.error('Train schedule search failed:', error);
      setDisplaySearchButton(true);
    }
  }, [postSearch, trainNameInput, timetableId, linkedPathDate, getExtremityDetails]);

  const resetLinkedPathSearch = () => {
    setDisplaySearchButton(true);
    setLinkedPathResults(undefined);
    setTrainNameInput('');
  };

  useEffect(() => {
    if (!isArrivalDateInSearchTimeWindow(linkedPathDate, searchDatetimeWindow)) {
      setLinkedPathDate(selectableSlot.start);
      resetLinkedPathSearch();
    }
  }, [selectableSlot]);

  return {
    displaySearchButton,
    launchTrainScheduleSearch,
    linkedPathDate,
    linkedPathResults,
    resetLinkedPathSearch,
    selectableSlot,
    setDisplaySearchButton,
    setLinkedPathDate,
    setLinkedPathResults,
    setTrainNameInput,
    trainNameInput,
  };
};

export default useLinkedPathSearch;
