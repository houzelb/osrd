import { sortBy } from 'lodash';

import type {
  MacroNodeResponse,
  ScenarioResponse,
  SearchResultItemOperationalPoint,
  TrainScheduleResult,
} from 'common/api/osrdEditoastApi';

export type NodeIndex = {
  node: MacroNodeResponse & { geocoord?: { lat: number; lng: number } };
  saved: boolean;
};

export default class MacroEditorState {
  /**
   * Storing nodes by path item key
   * It's the main storage for node.
   * The saved attribut is to know if the data comes from the API
   * If the value is a string, it's a key redirection
   */
  nodesByPathKey: Record<string, NodeIndex | string>;

  /**
   * We keep a dictionnary of id/key to be able to find a node by its id
   */
  nodesIdToKey: Record<number, string>;

  /**
   * Storing labels
   */
  labels: Set<string>;

  /**
   * NGE resource
   */
  ngeResource = { id: 1, capacity: 0 };

  /**
   * Default constructor
   */
  constructor(
    public readonly scenario: ScenarioResponse,
    public trainSchedules: TrainScheduleResult[]
  ) {
    // Empty
    this.labels = new Set<string>([]);
    this.nodesIdToKey = {};
    this.nodesByPathKey = {};
    this.ngeResource = { id: 1, capacity: trainSchedules.length };
  }

  /**
   * Check if we have duplicates
   * Ex: one key is trigram and an other is uic (with the same trigram), we should keep trigram
   * What we do :
   *  - Make a list of key,trigram
   *  - aggregate on trigram to build a list of key
   *  - filter if the array is of size 1 (ie, no dedup todo)
   *  - sort the keys by priority
   *  - add redirection in the nodesByPathKey
   */
  dedupNodes(): void {
    const trigramAggreg = Object.entries(this.nodesByPathKey)
      .filter(([_, value]) => typeof value !== 'string' && value.node.trigram)
      .map(([key, value]) => ({ key, trigram: (value as NodeIndex).node.trigram! }))
      .reduce(
        (acc, curr) => {
          acc[curr.trigram] = [...(acc[curr.trigram] || []), curr.key];
          return acc;
        },
        {} as Record<string, string[]>
      );

    for (const trig of Object.keys(trigramAggreg)) {
      if (trigramAggreg[trig].length < 2) {
        delete trigramAggreg[trig];
      }
      trigramAggreg[trig] = sortBy(trigramAggreg[trig], (key) => {
        if (key.startsWith('op_id:')) return 1;
        if (key.startsWith('trigram:')) return 2;
        if (key.startsWith('uic:')) return 3;
        // default
        return 4;
      });
    }

    Object.values(trigramAggreg).forEach((mergeList) => {
      const mainNodeKey = mergeList[0];
      mergeList.slice(1).forEach((key) => {
        this.nodesByPathKey[key] = mainNodeKey;
      });
    });
  }

  /**
   * Store and index the node.
   */
  indexNode(node: MacroNodeResponse, saved = false) {
    // Remove in the id index, its previous value
    const prevNode = this.getNodeByKey(node.path_item_key);
    if (prevNode && typeof prevNode !== 'string') {
      const prevId = prevNode.node.id;
      delete this.nodesIdToKey[prevId];
    }

    // Index
    this.nodesByPathKey[node.path_item_key] = { node, saved };
    this.nodesIdToKey[node.id] = node.path_item_key;
    node.labels.forEach((l) => {
      if (l) this.labels.add(l);
    });
  }

  /**
   * Update node's data by its key
   */
  updateNodeDataByKey(key: string, data: Partial<NodeIndex['node']>, saved?: boolean) {
    const indexedNode = this.getNodeByKey(key);
    if (indexedNode) {
      this.indexNode(
        { ...indexedNode.node, ...data },
        saved === undefined ? indexedNode.saved : saved
      );
    }
  }

  /**
   * Delete a node by its key
   */
  deleteNodeByKey(key: string) {
    const indexedNode = this.getNodeByKey(key);
    if (indexedNode) {
      delete this.nodesIdToKey[indexedNode.node.id];
      delete this.nodesByPathKey[key];
    }
  }

  /**
   * Get a node by its key.
   */
  getNodeByKey(key: string): NodeIndex | null {
    let result: NodeIndex | null = null;
    let currentKey: string | null = key;
    while (currentKey !== null) {
      const found: string | NodeIndex | undefined = this.nodesByPathKey[currentKey];
      if (typeof found === 'string') {
        currentKey = found;
      } else {
        currentKey = null;
        result = found || null;
      }
    }
    return result;
  }

  /**
   * Get a node by its id.
   */
  getNodeById(id: number) {
    const key = this.nodesIdToKey[id];
    return this.getNodeByKey(key);
  }

  /**
   * Given an path step, returns its pathKey
   */
  static getPathKey(item: TrainScheduleResult['path'][0]): string {
    if ('trigram' in item)
      return `trigram:${item.trigram}${item.secondary_code ? `/${item.secondary_code}` : ''}`;
    if ('operational_point' in item) return `op_id:${item.operational_point}`;
    if ('uic' in item)
      return `uic:${item.uic}${item.secondary_code ? `/${item.secondary_code}` : ''}`;

    return `track_offset:${item.track}+${item.offset}`;
  }

  /**
   * Given a search result item, returns all possible pathKeys, ordered by weight.
   */
  static getPathKeys(item: SearchResultItemOperationalPoint): string[] {
    const result = [];
    result.push(`op_id:${item.obj_id}`);
    result.push(`trigram:${item.trigram}${'ch' in item ? `/${item.ch}` : ''}`);
    result.push(`uic:${item.uic}${'ch' in item ? `/${item.ch}` : ''}`);
    item.track_sections.forEach((ts) => {
      result.push(`track_offset:${ts.track}+${ts.position}`);
    });
    return result;
  }
}
