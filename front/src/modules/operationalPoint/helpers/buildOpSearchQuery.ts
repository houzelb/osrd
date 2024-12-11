import type { SearchPayload, SearchQuery, TrainScheduleResult } from 'common/api/osrdEditoastApi';

/**
 * Build a search query to fetch all operational points from their UICs,
 * trigrams and IDs.
 */
const buildOpSearchQuery = (
  infraId: number,
  trainSchedules: TrainScheduleResult[]
): SearchPayload | null => {
  const pathItems = trainSchedules.map((schedule) => schedule.path).flat();
  const pathItemQueries = [];
  const pathItemSet = new Set<string>();

  for (const item of pathItems) {
    let query: SearchQuery;
    if ('uic' in item) {
      query = ['=', ['uic'], item.uic];
      if (item.secondary_code) {
        query = ['and', query, ['=', ['ch'], item.secondary_code]];
      }
    } else if ('trigram' in item) {
      query = ['=', ['trigram'], item.trigram];
      if (item.secondary_code) {
        query = ['and', query, ['=', ['ch'], item.secondary_code]];
      }
    } else if ('operational_point' in item) {
      query = ['=', ['obj_id'], item.operational_point];
    } else {
      continue; // track offset, handled by creating an empty node
    }

    // Avoid including the same query twice in the search payload
    const key = JSON.stringify(query);
    if (pathItemSet.has(key)) {
      continue;
    }

    pathItemSet.add(key);
    pathItemQueries.push(query);
  }

  if (pathItemQueries.length === 0) {
    return null;
  }

  return {
    object: 'operationalpoint',
    query: ['and', ['=', ['infra_id'], infraId], ['or', ...pathItemQueries]],
  };
};

export default buildOpSearchQuery;
