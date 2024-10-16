import { useMemo, useState, useCallback } from 'react';

import { compact, groupBy } from 'lodash';
import { useSelector } from 'react-redux';

import type { PathItem, SearchResultItemTrainSchedule } from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import { isEqualDate } from 'utils/date';

import type { StdcmLinkedPathResult, StdcmLinkedPathStep } from '../types';
import computeOpSchedules from '../utils/computeOpSchedules';

const useLinkedPathSearch = () => {
  const [postSearch] = osrdEditoastApi.endpoints.postSearch.useMutation();

  const { getTimetableID, getSearchDatetimeWindow } = useOsrdConfSelectors();

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
  const [hasSearchBeenLaunched, setHasSearchBeenLaunched] = useState(false);
  const [trainNameInput, setTrainNameInput] = useState('');
  const [linkedPathDate, setLinkedPathDate] = useState(selectableSlot.start);
  const [linkedPathResults, setLinkedPathResults] = useState<StdcmLinkedPathResult[]>([]);

  const getExtremitiesDetails = useCallback(
    async (pathItemList: PathItem[]) => {
      const origin = pathItemList.at(0)!;
      const destination = pathItemList.at(-1)!;
      if (!('operational_point' in origin) || !('operational_point' in destination))
        return undefined;
      const originId = origin.operational_point;
      const destinationId = destination.operational_point;

      try {
        const payloadOP = {
          object: 'operationalpoint',
          query: ['or', ['=', ['obj_id'], originId], ['=', ['obj_id'], destinationId]],
        };
        const resultsOP = await postSearch({ searchPayload: payloadOP, pageSize: 25 }).unwrap();
        const groupedResults = groupBy(resultsOP, 'obj_id');
        return {
          origin: groupedResults[originId][0],
          destination: groupedResults[destinationId][0],
        };
      } catch (error) {
        console.error('Failed to fetch operational points:', error);
        return undefined;
      }
    },
    [postSearch]
  );

  const launchTrainScheduleSearch = useCallback(async () => {
    setDisplaySearchButton(false);
    setLinkedPathResults([]);
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

      const newLinkedPathResults = await Promise.all(
        filteredResults.map(async (result) => {
          const opDetails = await getExtremitiesDetails(result.path);
          const computedOpSchedules = computeOpSchedules(
            result.start_time,
            result.schedule.at(-1)!.arrival!
          );
          if (opDetails === undefined) return undefined;
          return {
            trainName: result.train_name,
            origin: { ...opDetails.origin, ...computedOpSchedules.origin } as StdcmLinkedPathStep,
            destination: {
              ...opDetails.destination,
              ...computedOpSchedules.destination,
            } as StdcmLinkedPathStep,
          };
        })
      );
      setLinkedPathResults(compact(newLinkedPathResults));
      setHasSearchBeenLaunched(true);
    } catch (error) {
      console.error('Train schedule search failed:', error);
      setDisplaySearchButton(true);
    }
  }, [postSearch, trainNameInput, timetableId, linkedPathDate, getExtremitiesDetails]);

  return {
    displaySearchButton,
    hasSearchBeenLaunched,
    launchTrainScheduleSearch,
    linkedPathDate,
    linkedPathResults,
    selectableSlot,
    setDisplaySearchButton,
    setLinkedPathDate,
    setTrainNameInput,
    trainNameInput,
  };
};

export default useLinkedPathSearch;
