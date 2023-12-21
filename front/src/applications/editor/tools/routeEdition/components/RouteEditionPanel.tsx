import React, { FC, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import chroma from 'chroma-js';
import { isNil } from 'lodash';

import type { EndPoint, RouteEntity, WayPointEntity } from 'types';
import EditorContext from 'applications/editor/context';
import EntityError from 'applications/editor/components/EntityError';
import { NEW_ENTITY_ID } from 'applications/editor/data/utils';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useInfraID } from 'common/osrdContext';
import { save } from 'reducers/editor';
import { EndPointKeys, type RouteEditionState } from '../types';
import type { ExtendedEditorContextType } from '../../editorContextTypes';
import {
  getCompatibleRoutesPayload,
  getRouteEditionState,
  getRouteGeometries,
  routeHasExtremities,
} from '../utils';
import { Endpoints } from './EndPoints';
import { SearchRoute } from './SearchRoute';
import { RouteMetadata } from './RouteMetadata';

export const RouteEditionPanel: FC<{ state: RouteEditionState }> = ({ state }) => {
  const { t } = useTranslation();
  const infraID = useInfraID();
  const dispatch = useDispatch();
  const [postPathfinding] = osrdEditoastApi.endpoints.postInfraByInfraIdPathfinding.useMutation();
  const { setState, isFormSubmited, setIsFormSubmited } = useContext(
    EditorContext
  ) as ExtendedEditorContextType<RouteEditionState>;

  const isNew = useMemo(
    () => !state.entity || state.entity.properties.id === NEW_ENTITY_ID,
    [state.entity]
  );

  const disableTransit = useMemo(() => {
    let shouldbeDisabled = true;
    if (state.entity.properties.release_detectors.length > 0) {
      shouldbeDisabled = false;
    }
    // We can swith from empty to filled when there is a selected route in the search
    // because we've got the data
    else if (
      state.optionsState.type === 'options' &&
      !isNil(state.optionsState.focusedOptionIndex)
    ) {
      shouldbeDisabled = false;
    }
    return shouldbeDisabled;
  }, [state]);

  /**
   * Function to save an entity.
   * if previous is not provided, then it's a create, otherwise it's an update
   */
  const saveEntity = useCallback(
    async (entity: RouteEntity, previous?: RouteEntity) => {
      const payload = previous
        ? {
            update: [
              {
                source: previous,
                target: entity,
              },
            ],
          }
        : {
            create: [entity],
          };

      const result = (await dispatch<unknown>(save(infraID, payload))) as Array<{
        railjson: RouteEntity['properties'];
      }>;
      setState((prev) => ({
        ...getRouteEditionState({
          ...entity,
          properties: result && result[0] ? result[0].railjson : entity.properties,
        } as RouteEntity),
        // we keep the extremetiesEntity state, it has not changed
        extremitiesEntity: prev.extremitiesEntity,
      }));
    },
    [infraID, dispatch, setState]
  );

  /**
   * What we do when the rigid transit checkbox changed
   */
  const onReleaseDetectorChange = useCallback(
    (withDetector: boolean) => {
      setState((prev) => {
        let detectors: string[] = [];
        if (
          withDetector &&
          prev.optionsState.type === 'options' &&
          !isNil(prev.optionsState.focusedOptionIndex)
        ) {
          const selectedCandidate = prev.optionsState.options[prev.optionsState.focusedOptionIndex];
          detectors = selectedCandidate.data.detectors;
        }
        return {
          ...prev,
          entity: {
            ...prev.entity,
            properties: {
              ...prev.entity.properties,
              release_detectors: detectors,
            },
          },
        };
      });
    },
    [setState]
  );

  /**
   * Function to search for routes
   */
  const searchAltRoutes = useCallback(async () => {
    const route = state.entity;
    try {
      setState({
        optionsState: { type: 'loading' },
      });
      if (!infraID) throw new Error('No infra selected');
      const payload = await getCompatibleRoutesPayload(
        infraID,
        route.properties.entry_point,
        route.properties.exit_point,
        dispatch
      );
      const candidates = await postPathfinding({
        infraId: infraID,
        pathfindingInput: payload,
      }).unwrap();

      const candidateColors = chroma
        .scale(['#321BF7CC', '#37B5F0CC', '#F0901FCC', '#F7311BCC', '#D124E0CC'])
        .mode('lch')
        .colors(candidates.length)
        .map((str) => chroma(str).hex());

      const features = await getRouteGeometries(
        infraID as number,
        route.properties.entry_point,
        route.properties.exit_point,
        candidates,
        dispatch
      );

      setState({
        optionsState: {
          type: 'options',
          options: candidates.map((candidate, i) => ({
            data: candidate,
            color: candidateColors[i],
            feature: { ...features[i], properties: { color: candidateColors[i], index: i } },
          })),
        },
      });
    } catch (e) {
      setState({ optionsState: { type: 'idle' } });
    }
  }, [infraID, setState, state.entity]);

  /**
   * Function that selects a new route search item (or unselected it)
   */
  const selectSearchRouteItem = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.optionsState.type !== 'options' || !prev.entity) return prev;

        const isCurrentSelection = index === prev.optionsState.focusedOptionIndex;
        const candidate = prev.optionsState.options[index];
        const route: RouteEntity = {
          ...prev.entity,
          properties: {
            ...prev.entity.properties,
            ...(!isCurrentSelection
              ? {
                  entry_point_direction: candidate.data.track_ranges[0].direction,
                  switches_directions: candidate.data.switches_directions,
                  release_detectors: candidate.data.detectors,
                }
              : {}),
          },
        };
        return {
          ...prev,
          entity: route,
          isComplete: !isCurrentSelection,
          optionsState: {
            ...prev.optionsState,
            focusedOptionIndex: !isCurrentSelection ? index : undefined,
          },
        };
      });
    },
    [setState]
  );

  /**
   * Function to change a route extremity.
   */
  const extremetyUpdate = useCallback(
    (waypoint: WayPointEntity | null, endPoint: EndPoint) => {
      setState((prev) => ({
        ...prev,
        entity: {
          ...prev.entity,
          properties: {
            ...prev.entity.properties,
            [EndPointKeys[endPoint]]: waypoint
              ? {
                  type: waypoint.objType,
                  id: waypoint.properties.id,
                }
              : { type: 'Detector', id: NEW_ENTITY_ID },
          },
        },
        isComplete:
          prev.entity.properties[EndPointKeys[endPoint]].id === waypoint?.properties.id
            ? prev.isComplete
            : false,
        extremityState: { type: 'idle' },
        extremitiesEntity: {
          ...prev.extremitiesEntity,
          [endPoint]: waypoint,
        },
        optionsState: { type: 'idle' },
      }));
    },
    [setState]
  );

  /**
   * Function to switch extremities
   */
  const extremetiesSwitch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      entity: {
        ...prev.entity,
        properties: {
          ...prev.entity.properties,
          entry_point: prev.entity.properties.exit_point,
          exit_point: prev.entity.properties.entry_point,
        },
      },
      extremitiesEntity: {
        BEGIN: prev.extremitiesEntity.END,
        END: prev.extremitiesEntity.BEGIN,
      },
      isComplete: false,
      extremityState: { type: 'idle' },
      optionsState: { type: 'idle' },
    }));
  }, [setState]);

  /**
   * When clicking on the save button in the toolbar
   */
  useEffect(() => {
    if (isFormSubmited && setIsFormSubmited && state.entity) {
      setIsFormSubmited(false);
      saveEntity(
        state.entity,
        state.entity.properties.id !== NEW_ENTITY_ID ? state.initialEntity : undefined
      );
    }
  }, [isFormSubmited, saveEntity, state.entity, state.initialEntity, setIsFormSubmited]);

  return (
    <div className="position-relative">
      <legend>
        {isNew
          ? t('Editor.tools.routes-edition.create-route')
          : t('Editor.tools.routes-edition.edit-route')}
      </legend>

      <Endpoints
        entity={state.entity}
        onExtremityChange={extremetyUpdate}
        onExtremitiesSiwtch={extremetiesSwitch}
      />

      <hr />
      <RouteMetadata
        entity={state.entity}
        onChange={onReleaseDetectorChange}
        disabled={!state.isComplete}
        disableTransit={disableTransit}
      />
      <hr />

      {!isNew && <EntityError className="my-2" entity={state.entity} />}

      <SearchRoute
        searchFn={searchAltRoutes}
        selectFn={selectSearchRouteItem}
        state={state.optionsState}
        isNew={isNew}
        disabled={!routeHasExtremities(state.entity)}
      />
    </div>
  );
};

export default RouteEditionPanel;
