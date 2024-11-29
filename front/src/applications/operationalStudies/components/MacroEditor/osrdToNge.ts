import { isNil, uniqBy } from 'lodash';

import type {
  MacroNodeResponse,
  SearchPayload,
  SearchQuery,
  SearchResultItemOperationalPoint,
} from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import type { AppDispatch } from 'store';

import MacroEditorState, { type NodeIndex } from './MacroEditorState';
import { addDurationToDate } from './utils';
import {
  type PortDto,
  type TimeLockDto,
  type TrainrunSectionDto,
  type TrainrunCategory,
  type TrainrunTimeCategory,
  type TrainrunFrequency,
  type NetzgrafikDto,
  type LabelGroupDto,
  PortAlignment,
} from '../NGE/types';

const TRAINRUN_CATEGORY_HALTEZEITEN = {
  HaltezeitIPV: { haltezeit: 0, no_halt: false },
  HaltezeitA: { haltezeit: 0, no_halt: false },
  HaltezeitB: { haltezeit: 0, no_halt: false },
  HaltezeitC: { haltezeit: 0, no_halt: false },
  HaltezeitD: { haltezeit: 0, no_halt: false },
  HaltezeitUncategorized: { haltezeit: 0, no_halt: false },
};

const DEFAULT_LABEL_GROUP: LabelGroupDto = {
  id: 1,
  name: 'Default',
  labelRef: 'Trainrun',
};

const DEFAULT_TRAINRUN_CATEGORY: TrainrunCategory = {
  id: 1, // In NGE, Trainrun.DEFAULT_TRAINRUN_CATEGORY
  order: 0,
  name: 'Default',
  shortName: '', // TODO: find a better way to hide this in the graph
  fachCategory: 'HaltezeitUncategorized',
  colorRef: 'EC',
  minimalTurnaroundTime: 0,
  nodeHeadwayStop: 0,
  nodeHeadwayNonStop: 0,
  sectionHeadway: 0,
};

export const DEFAULT_TRAINRUN_FREQUENCIES: TrainrunFrequency[] = [
  {
    id: 2,
    order: 0,
    frequency: 30,
    offset: 0,
    name: 'Half-hourly',
    shortName: '30',
    linePatternRef: '30',
  },
  {
    id: 3, // default NGE frequency takes id 3
    order: 1,
    frequency: 60,
    offset: 0,
    name: 'Hourly',
    /** Short name, needs to be unique */
    shortName: '60',
    linePatternRef: '60',
  },
  {
    id: 4,
    order: 2,
    frequency: 120,
    offset: 0,
    name: 'Two-hourly',
    shortName: '120',
    linePatternRef: '120',
  },
];

export const DEFAULT_TRAINRUN_FREQUENCY: TrainrunFrequency = DEFAULT_TRAINRUN_FREQUENCIES[1];

const DEFAULT_TRAINRUN_TIME_CATEGORY: TrainrunTimeCategory = {
  id: 0, // In NGE, Trainrun.DEFAULT_TRAINRUN_TIME_CATEGORY
  order: 0,
  name: 'Default',
  shortName: '7/24',
  dayTimeInterval: [],
  weekday: [1, 2, 3, 4, 5, 6, 7],
  linePatternRef: '7/24',
};

const DEFAULT_DTO: NetzgrafikDto = {
  resources: [],
  nodes: [],
  trainruns: [],
  trainrunSections: [],
  metadata: {
    netzgrafikColors: [],
    trainrunCategories: [DEFAULT_TRAINRUN_CATEGORY],
    trainrunFrequencies: [...DEFAULT_TRAINRUN_FREQUENCIES],
    trainrunTimeCategories: [DEFAULT_TRAINRUN_TIME_CATEGORY],
  },
  freeFloatingTexts: [],
  labels: [],
  labelGroups: [],
  filterData: {
    filterSettings: [],
  },
};

const DEFAULT_TIME_LOCK: TimeLockDto = {
  time: null,
  consecutiveTime: null,
  lock: false,
  warning: null,
  timeFormatter: null,
};

/**
 * Build a search query to fetch all operational points from their UICs,
 * trigrams and IDs.
 */
const buildOpQuery = (state: MacroEditorState): SearchPayload | null => {
  const pathItems = state.trainSchedules.flatMap((train) => train.path);
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
    query: ['and', ['=', ['infra_id'], state.scenario.infra_id], ['or', ...pathItemQueries]],
  };
};

/**
 * Execute the search payload and collect all result pages.
 */
const executeSearch = async (
  state: MacroEditorState,
  dispatch: AppDispatch
): Promise<SearchResultItemOperationalPoint[]> => {
  const searchPayload = buildOpQuery(state);
  if (!searchPayload) {
    return [];
  }
  const pageSize = 100;
  let done = false;
  const searchResults: SearchResultItemOperationalPoint[] = [];
  for (let page = 1; !done; page += 1) {
    const searchPromise = dispatch(
      osrdEditoastApi.endpoints.postSearch.initiate(
        {
          page,
          pageSize,
          searchPayload,
        },
        { track: false }
      )
    );
    const results = (await searchPromise.unwrap()) as SearchResultItemOperationalPoint[];
    searchResults.push(...results);
    done = results.length < pageSize;
  }
  return searchResults;
};

/**
 * Apply a layout on nodes and save the new position.
 * Nodes that are saved are fixed.
 */
const applyLayout = (state: MacroEditorState) => {
  const indexedNodes = uniqBy(
    state.trainSchedules.flatMap((ts) => ts.path),
    MacroEditorState.getPathKey
  ).map((pathItem) => {
    const key = MacroEditorState.getPathKey(pathItem);
    return state.getNodeByKey(key)!;
  });

  const geoNodes = indexedNodes.filter((n) => n.node.geocoord);
  const xCoords = geoNodes.map((n) => n.node.geocoord!.lng);
  const yCoords = geoNodes.map((n) => n.node.geocoord!.lat);
  const minX = Math.min(...xCoords);
  const minY = Math.min(...yCoords);
  const maxX = Math.max(...xCoords);
  const maxY = Math.max(...yCoords);
  const width = maxX - minX;
  const height = maxY - minY;

  // TODO: grab NGE component size
  const scaleX = 800;
  const scaleY = 500;
  const padding = 0.1;

  for (const n of indexedNodes) {
    if (!n.saved && n.node.geocoord !== undefined) {
      const normalizedX = (n.node.geocoord.lng - minX) / (width || 1);
      const normalizedY = 1 - (n.node.geocoord.lat - minY) / (height || 1);
      const paddedX = normalizedX * (1 - 2 * padding) + padding;
      const paddedY = normalizedY * (1 - 2 * padding) + padding;
      state.updateNodeDataByKey(n.node.path_item_key, {
        position_x: Math.round(scaleX * paddedX),
        position_y: Math.round(scaleY * paddedY),
      });
    }
  }
};

/**
 * Get nodes of the scenario that are saved in the DB.
 */
const apiGetSavedNodes = async (
  state: MacroEditorState,
  dispatch: AppDispatch
): Promise<MacroNodeResponse[]> => {
  const pageSize = 100;
  let page = 1;
  let reachEnd = false;
  const result: MacroNodeResponse[] = [];
  while (!reachEnd) {
    const promise = dispatch(
      osrdEditoastApi.endpoints.getProjectsByProjectIdStudiesAndStudyIdScenariosScenarioIdMacroNodes.initiate(
        {
          projectId: state.scenario.project.id,
          studyId: state.scenario.study_id,
          scenarioId: state.scenario.id,
          pageSize,
          page,
        },
        { forceRefetch: true, subscribe: false }
      )
    );
    // need to unsubscribe on get call to avoid cache issue
    const { data } = await promise;
    if (data) result.push(...data.results);
    reachEnd = isNil(data?.next);
    page += 1;
  }
  return result;
};

const apiDeleteNode = async (
  state: MacroEditorState,
  dispatch: AppDispatch,
  node: MacroNodeResponse
) => {
  try {
    await dispatch(
      osrdEditoastApi.endpoints.deleteProjectsByProjectIdStudiesAndStudyIdScenariosScenarioIdMacroNodesNodeId.initiate(
        {
          projectId: state.scenario.project.id,
          studyId: state.scenario.study_id,
          scenarioId: state.scenario.id,
          nodeId: node.id,
        }
      )
    );
  } catch (e) {
    console.error(e);
  }
};

/**
 * Cast a node into NGE format.
 */
const castNodeToNge = (
  state: MacroEditorState,
  node: NodeIndex['node']
): NetzgrafikDto['nodes'][0] => {
  const labelsList = Array.from(state.labels);
  return {
    id: node.id,
    betriebspunktName: node.trigram || '',
    fullName: node.full_name || '',
    positionX: node.position_x,
    positionY: node.position_y,
    ports: [],
    transitions: [],
    connections: [],
    resourceId: state.ngeResource.id,
    perronkanten: 10,
    connectionTime: node.connection_time,
    trainrunCategoryHaltezeiten: TRAINRUN_CATEGORY_HALTEZEITEN,
    symmetryAxis: 0,
    warnings: [],
    labelIds: (node.labels || []).map((l) => labelsList.findIndex((e) => e === l)),
  };
};

/**
 * Load & index the data of the train schedule for the given scenario
 */
export const loadAndIndexNge = async (
  state: MacroEditorState,
  dispatch: AppDispatch
): Promise<void> => {
  // Load path items
  let nbNodesIndexed = 0;
  state.trainSchedules
    .flatMap((train) => train.path)
    .forEach((pathItem, index) => {
      const key = MacroEditorState.getPathKey(pathItem);
      if (!state.getNodeByKey(key)) {
        const macroNode = {
          // negative is just to be sure that the id is not already taken
          // by a node saved in the DB
          id: index * -1,
          path_item_key: key,
          connection_time: 0,
          labels: [],
          // we put the nodes on a grid
          position_x: (nbNodesIndexed % 8) * 200,
          position_y: Math.trunc(nbNodesIndexed / 8),
        };
        state.indexNode(macroNode);
        nbNodesIndexed += 1;
      }
    });

  // Enhance nodes by calling the search API
  const searchResults = await executeSearch(state, dispatch);
  searchResults.forEach((searchResult) => {
    const macroNode = {
      fullName: searchResult.name,
      trigram: searchResult.trigram + (searchResult.ch ? `/${searchResult.ch}` : ''),
      geocoord: {
        lng: searchResult.geographic.coordinates[0],
        lat: searchResult.geographic.coordinates[1],
      },
    };
    MacroEditorState.getPathKeys(searchResult).forEach((pathKey) => {
      state.updateNodeDataByKey(pathKey, macroNode);
    });
  });

  // Load saved nodes and update the indexed nodes
  // If a saved node is not present in the train schedule, we delete it
  // this can happen if we delete a TS on which a node was saved
  const savedNodes = await apiGetSavedNodes(state, dispatch);
  await Promise.all(
    savedNodes.map(async (n) => {
      if (state.getNodeByKey(n.path_item_key)) state.updateNodeDataByKey(n.path_item_key, n, true);
      else await apiDeleteNode(state, dispatch, n);
    })
  );

  // Dedup nodes
  state.dedupNodes();

  // Index trainschedule labels
  state.trainSchedules.forEach((ts) => {
    ts.labels?.forEach((l) => {
      state.labels.add(l);
    });
  });

  // Now that we have all nodes, we apply a layout
  applyLayout(state);
};

/**
 * Translate the train schedule in NGE "trainruns".
 */
const getNgeTrainruns = (state: MacroEditorState) =>
  state.trainSchedules.map((trainSchedule) => ({
    id: trainSchedule.id,
    name: trainSchedule.train_name,
    categoryId: DEFAULT_TRAINRUN_CATEGORY.id,
    frequencyId: DEFAULT_TRAINRUN_FREQUENCY.id,
    trainrunTimeCategoryId: DEFAULT_TRAINRUN_TIME_CATEGORY.id,
    labelIds: (trainSchedule.labels || []).map((l) =>
      Array.from(state.labels).findIndex((e) => e === l)
    ),
  }));

/**
 * Translate the train schedule in NGE "trainrunSection" & "nodes".
 * It is needed to return the nodes as well, because we add ports & transitions on them
 */
const getNgeTrainrunSectionsWithNodes = (state: MacroEditorState) => {
  let portId = 1;
  const createPort = (trainrunSectionId: number) => {
    const port = {
      id: portId,
      trainrunSectionId,
      positionIndex: 0,
      positionAlignment: PortAlignment.Top,
    };
    portId += 1;
    return port;
  };

  let transitionId = 1;
  const createTransition = (port1Id: number, port2Id: number) => {
    const transition = {
      id: transitionId,
      port1Id,
      port2Id,
      isNonStopTransit: false,
    };
    transitionId += 1;
    return transition;
  };

  // Track nge nodes
  const ngeNodesByPathKey: Record<string, NetzgrafikDto['nodes'][0]> = {};
  let trainrunSectionId = 0;
  const trainrunSections: TrainrunSectionDto[] = state.trainSchedules.flatMap((trainSchedule) => {
    // Figure out the primary node key for each path item
    const pathNodeKeys = trainSchedule.path.map((pathItem) => {
      const node = state.getNodeByKey(MacroEditorState.getPathKey(pathItem));
      return node!.node.path_item_key;
    });

    const startTime = new Date(trainSchedule.start_time);
    const createTimeLock = (time: Date): TimeLockDto => ({
      time: time.getMinutes(),
      // getTime() is in milliseconds, consecutiveTime is in minutes
      consecutiveTime: (time.getTime() - startTime.getTime()) / (60 * 1000),
      lock: false,
      warning: null,
      timeFormatter: null,
    });

    // OSRD describes the path in terms of nodes, NGE describes it in terms
    // of sections between nodes. Iterate over path items two-by-two to
    // convert them.
    let prevPort: PortDto | null = null;
    return pathNodeKeys.slice(0, -1).map((sourceNodeKey, i) => {
      // Get the source node or created it
      if (!ngeNodesByPathKey[sourceNodeKey]) {
        ngeNodesByPathKey[sourceNodeKey] = castNodeToNge(
          state,
          state.getNodeByKey(sourceNodeKey)!.node
        );
      }
      const sourceNode = ngeNodesByPathKey[sourceNodeKey];

      // Get the target node or created it
      const targetNodeKey = pathNodeKeys[i + 1];
      if (!ngeNodesByPathKey[targetNodeKey]) {
        ngeNodesByPathKey[targetNodeKey] = castNodeToNge(
          state,
          state.getNodeByKey(targetNodeKey)!.node
        );
      }
      const targetNode = ngeNodesByPathKey[targetNodeKey];

      // Adding port
      const sourcePort = createPort(trainrunSectionId);
      sourceNode.ports.push(sourcePort);
      const targetPort = createPort(trainrunSectionId);
      targetNode.ports.push(targetPort);

      // Adding schedule
      const sourceScheduleEntry = trainSchedule.schedule!.find(
        (entry) => entry.at === trainSchedule.path[i].id
      );
      const targetScheduleEntry = trainSchedule.schedule!.find(
        (entry) => entry.at === trainSchedule.path[i + 1].id
      );

      // Create a transition between the previous section and the one we're creating
      if (prevPort) {
        const transition = createTransition(prevPort.id, sourcePort.id);
        transition.isNonStopTransit = !sourceScheduleEntry?.stop_for;
        sourceNode.transitions.push(transition);
      }
      prevPort = targetPort;

      let sourceDeparture = { ...DEFAULT_TIME_LOCK };
      if (i === 0) {
        sourceDeparture = createTimeLock(startTime);
      } else if (sourceScheduleEntry && sourceScheduleEntry.arrival) {
        sourceDeparture = createTimeLock(
          addDurationToDate(
            addDurationToDate(startTime, sourceScheduleEntry.arrival),
            sourceScheduleEntry.stop_for || 'P0D'
          )
        );
      }

      let targetArrival = { ...DEFAULT_TIME_LOCK };
      if (targetScheduleEntry && targetScheduleEntry.arrival) {
        targetArrival = createTimeLock(addDurationToDate(startTime, targetScheduleEntry.arrival));
      }

      const travelTime = { ...DEFAULT_TIME_LOCK };
      if (targetArrival.consecutiveTime !== null && sourceDeparture.consecutiveTime !== null) {
        travelTime.time = targetArrival.consecutiveTime - sourceDeparture.consecutiveTime;
        travelTime.consecutiveTime = travelTime.time;
      }

      const trainrunSection = {
        id: trainrunSectionId,
        sourceNodeId: sourceNode.id,
        sourcePortId: sourcePort.id,
        targetNodeId: targetNode.id,
        targetPortId: targetPort.id,
        travelTime,
        sourceDeparture,
        sourceArrival: { ...DEFAULT_TIME_LOCK },
        targetDeparture: { ...DEFAULT_TIME_LOCK },
        targetArrival,
        numberOfStops: 0,
        trainrunId: trainSchedule.id,
        resourceId: state.ngeResource.id,
        path: {
          path: [],
          textPositions: [],
        },
        specificTrainrunSectionFrequencyId: 0,
        warnings: [],
      };

      trainrunSectionId += 1;
      return trainrunSection;
    });
  });

  return {
    trainrunSections,
    nodes: Object.values(ngeNodesByPathKey),
  };
};

/**
 * Return a compatible object for NGE
 */
export const getNgeDto = (state: MacroEditorState): NetzgrafikDto => ({
  ...DEFAULT_DTO,
  labels: Array.from(state.labels).map((l, i) => ({
    id: i,
    label: l,
    labelGroupId: DEFAULT_LABEL_GROUP.id,
    labelRef: 'Trainrun',
  })),
  labelGroups: [DEFAULT_LABEL_GROUP],
  resources: [state.ngeResource],
  metadata: {
    netzgrafikColors: [],
    trainrunCategories: [DEFAULT_TRAINRUN_CATEGORY],
    trainrunFrequencies: [DEFAULT_TRAINRUN_FREQUENCY],
    trainrunTimeCategories: [DEFAULT_TRAINRUN_TIME_CATEGORY],
  },
  trainruns: getNgeTrainruns(state),
  ...getNgeTrainrunSectionsWithNodes(state),
});
