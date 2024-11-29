import { useState, useEffect, useReducer } from 'react';

import { compact, isEqual, isObject } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { useScenarioContext } from 'applications/operationalStudies/hooks/useScenarioContext';
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import type {
  IncompatibleConstraints,
  PathfindingInputError,
  PathfindingResultSuccess,
  PostInfraByInfraIdPathPropertiesApiArg,
  PostInfraByInfraIdPathfindingBlocksApiArg,
  RollingStockWithLiveries,
} from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import { initialState } from 'modules/pathfinding/consts';
import type { PathfindingAction, PathfindingState } from 'modules/pathfinding/types';
import {
  formatSuggestedOperationalPoints,
  getPathfindingQuery,
  matchPathStepAndOp,
  upsertPathStepsInOPs,
} from 'modules/pathfinding/utils';
import { useStoreDataForRollingStockSelector } from 'modules/rollingStock/components/RollingStockSelector/useStoreDataForRollingStockSelector';
import type { SuggestedOP } from 'modules/trainschedule/components/ManageTrainSchedule/types';
import { setFailure, setWarning } from 'reducers/main';
import type { PathStep } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';
import { isEmptyArray } from 'utils/array';
import { castErrorToFailure } from 'utils/error';

import useInfraStatus from './useInfraStatus';

export function reducer(state: PathfindingState, action: PathfindingAction): PathfindingState {
  switch (action.type) {
    case 'PATHFINDING_STARTED': {
      return {
        ...state,
        running: true,
        done: false,
        error: '',
        mustBeLaunched: false,
        cancelled: false,
      };
    }
    case 'PATHFINDING_CANCELLED': {
      return {
        ...state,
        running: false,
        done: false,
        error: '',
        mustBeLaunched: false,
        cancelled: true,
      };
    }
    case 'PATHFINDING_FINISHED': {
      if (state.cancelled) {
        return {
          ...state,
          running: false,
          done: false,
          error: '',
          mustBeLaunched: false,
          mustBeLaunchedManually: false,
        };
      }
      return {
        ...state,
        running: false,
        done: true,
        error: '',
        mustBeLaunched: false,
        mustBeLaunchedManually: false,
      };
    }
    case 'PATHFINDING_ERROR': {
      return {
        ...state,
        running: false,
        done: false,
        error: action.message || '',
        mustBeLaunched: false,
      };
    }
    case 'PATHFINDING_INCOMPATIBLE_CONSTRAINTS': {
      return {
        ...state,
        running: false,
        done: false,
        error: action.message || '',
        mustBeLaunched: false,
      };
    }
    case 'PATHFINDING_PARAM_CHANGED':
    case 'VIAS_CHANGED': {
      if (
        !action.params ||
        state.running ||
        (!action.params.origin && !action.params.destination)
      ) {
        return { ...state };
      }
      const { origin, destination, rollingStock } = action.params;
      if (!origin || !destination || !rollingStock) {
        return {
          ...state,
          running: false,
          error: '',
          done: false,
          missingParam: true,
        };
      }
      return {
        ...state,
        error: '',
        mustBeLaunched: true,
        missingParam: false,
      };
    }
    default:
      throw new Error('Pathfinding action doesn’t exist');
  }
}

function init({
  origin,
  destination,
  rollingStock,
  pathSteps,
  pathProperties,
}: {
  origin: PathStep | null;
  destination: PathStep | null;
  rollingStock?: RollingStockWithLiveries;
  pathSteps: (PathStep | null)[];
  pathProperties?: ManageTrainSchedulePathProperties;
}): PathfindingState {
  if (compact(pathSteps).length === 0 || !pathProperties?.geometry) {
    return {
      ...initialState,
      mustBeLaunched: Boolean(origin) && Boolean(destination) && Boolean(rollingStock),
    };
  }
  return initialState;
}

export const usePathfinding = (
  setPathProperties?: (pathProperties?: ManageTrainSchedulePathProperties) => void | null,
  pathProperties?: ManageTrainSchedulePathProperties
) => {
  const { t } = useTranslation(['operationalStudies/manageTrainSchedule']);
  const dispatch = useAppDispatch();
  const { getOrigin, getDestination, getVias, getPathSteps, getPowerRestriction } =
    useOsrdConfSelectors();
  const origin = useSelector(getOrigin, isEqual);
  const destination = useSelector(getDestination, isEqual);
  const vias = useSelector(getVias(), isEqual);
  const pathSteps = useSelector(getPathSteps);
  const powerRestrictions = useSelector(getPowerRestriction);
  const { infra, reloadCount, setIsInfraError } = useInfraStatus();
  const { rollingStock } = useStoreDataForRollingStockSelector();

  const initializerArgs = {
    origin,
    destination,
    rollingStock,
    pathSteps,
    pathProperties,
  };
  const [pathfindingState, pathfindingDispatch] = useReducer(reducer, initializerArgs, init);

  const [isPathfindingInitialized, setIsPathfindingInitialized] = useState(false);

  const [postPathfindingBlocks] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathfindingBlocks.useLazyQuery();
  const [postPathProperties] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathProperties.useLazyQuery();

  const { updatePathSteps } = useOsrdConfActions();
  const { infraId } = useScenarioContext();

  const generatePathfindingParams = (): PostInfraByInfraIdPathfindingBlocksApiArg | null => {
    setPathProperties?.(undefined);

    const filteredPathSteps = pathSteps.filter(
      (step) => step !== null && step.coordinates !== null && !step.isInvalid
    );

    return getPathfindingQuery({
      infraId,
      rollingStock,
      pathSteps: filteredPathSteps,
    });
  };

  useEffect(() => {
    if (isPathfindingInitialized) {
      pathfindingDispatch({
        type: 'VIAS_CHANGED',
        params: {
          origin,
          destination,
          rollingStock,
        },
      });
    }
  }, [vias]);

  useEffect(() => {
    if (isPathfindingInitialized) {
      pathfindingDispatch({
        type: 'PATHFINDING_PARAM_CHANGED',
        params: {
          origin,
          destination,
          rollingStock,
        },
      });
    }
  }, [origin, destination, rollingStock]);

  const handleInvalidPathItems = (
    steps: (PathStep | null)[],
    invalidPathItems: Extract<PathfindingInputError, { error_type: 'invalid_path_items' }>['items']
  ) => {
    // TODO: we currently only handle invalid pathSteps with trigram. We will have to do it for trackOffset, opId and uic too.
    const invalidTrigrams = invalidPathItems
      .map((item) => {
        if ('trigram' in item.path_item) {
          return item.path_item.trigram;
        }
        return null;
      })
      .filter((trigram): trigram is string => trigram !== null);
    if (invalidTrigrams.length > 0) {
      const updatedPathSteps = steps.map((step) => {
        if (step && 'trigram' in step && invalidTrigrams.includes(step.trigram)) {
          return { ...step, isInvalid: true };
        }
        return step;
      });

      dispatch(updatePathSteps(updatedPathSteps));
      pathfindingDispatch({ type: 'PATHFINDING_FINISHED' });
      pathfindingDispatch({ type: 'PATHFINDING_PARAM_CHANGED' });
    } else {
      dispatch(setFailure({ name: t('pathfindingError'), message: t('missingPathSteps') }));
    }
  };

  useEffect(() => {
    const populateStoreWithPathfinding = async (
      pathResult: PathfindingResultSuccess,
      incompatibleConstraints?: IncompatibleConstraints
    ) => {
      const pathPropertiesParams: PostInfraByInfraIdPathPropertiesApiArg = {
        infraId,
        props: ['electrifications', 'geometry', 'operational_points'],
        pathPropertiesInput: {
          track_section_ranges: pathResult.track_section_ranges,
        },
      };
      const { electrifications, geometry, operational_points } =
        await postPathProperties(pathPropertiesParams).unwrap();

      if (!electrifications || !geometry || !operational_points) {
        return;
      }

      const suggestedOperationalPoints: SuggestedOP[] = formatSuggestedOperationalPoints(
        operational_points,
        geometry,
        pathResult.length
      );

      // We update existing pathsteps with coordinates, positionOnPath and kp corresponding to the new pathfinding result
      const updatedPathSteps: (PathStep | null)[] = pathSteps.map((step, i) => {
        if (!step) return step;
        const correspondingOp = suggestedOperationalPoints.find((suggestedOp) =>
          matchPathStepAndOp(step, suggestedOp)
        );

        const theoreticalMargin = i === 0 ? step.theoreticalMargin || '0%' : step.theoreticalMargin;

        const stopFor = i === pathSteps.length - 1 && !step.stopFor ? '0' : step.stopFor;
        const stopType = i === pathSteps.length - 1 && !step.stopFor ? undefined : step.stopType;

        return {
          ...step,
          positionOnPath: pathResult.path_item_positions[i],
          stopFor,
          stopType,
          theoreticalMargin,
          ...(correspondingOp && {
            name: correspondingOp.name,
            uic: correspondingOp.uic,
            ch: correspondingOp.ch,
            kp: correspondingOp.kp,
            coordinates: correspondingOp.coordinates,
          }),
        };
      });

      if (!isEmptyArray(powerRestrictions)) {
        dispatch(
          setWarning({
            title: t('warningMessages.pathfindingChange'),
            text: t('warningMessages.powerRestrictionsReset'),
          })
        );
      }
      dispatch(updatePathSteps(updatedPathSteps));

      const allWaypoints = upsertPathStepsInOPs(
        suggestedOperationalPoints,
        compact(updatedPathSteps)
      );

      setPathProperties?.({
        electrifications,
        geometry,
        suggestedOperationalPoints,
        allWaypoints,
        length: pathResult.length,
        trackSectionRanges: pathResult.track_section_ranges,
        incompatibleConstraints,
      });
    };

    const startPathFinding = async () => {
      if (pathfindingState.running) {
        return;
      }

      pathfindingDispatch({ type: 'PATHFINDING_STARTED' });
      const pathfindingInput = generatePathfindingParams();
      if (!pathfindingInput) {
        dispatch(
          setFailure({
            name: t('pathfinding'),
            message: t('pathfindingMissingParamsSimple'),
          })
        );
        return;
      }

      try {
        const pathfindingResult = await postPathfindingBlocks(pathfindingInput).unwrap();

        if (pathfindingResult.status === 'success') {
          await populateStoreWithPathfinding(pathfindingResult);
          pathfindingDispatch({ type: 'PATHFINDING_FINISHED' });
          return;
        }

        const incompatibleConstraintsCheck =
          pathfindingResult.failed_status === 'pathfinding_not_found' &&
          pathfindingResult.error_type === 'incompatible_constraints';

        if (incompatibleConstraintsCheck) {
          await populateStoreWithPathfinding(
            pathfindingResult.relaxed_constraints_path,
            pathfindingResult.incompatible_constraints
          );
          pathfindingDispatch({
            type: 'PATHFINDING_INCOMPATIBLE_CONSTRAINTS',
            message: t(`pathfindingErrors.${pathfindingResult.error_type}`),
          });
          return;
        }

        const hasInvalidPathItems =
          pathfindingResult.failed_status === 'pathfinding_input_error' &&
          pathfindingResult.error_type === 'invalid_path_items';

        if (hasInvalidPathItems) {
          handleInvalidPathItems(pathSteps, pathfindingResult.items);
          return;
        }

        let error: string;
        if (pathfindingResult.failed_status === 'internal_error') {
          const translationKey = pathfindingResult.core_error.type.startsWith('core:')
            ? pathfindingResult.core_error.type.replace('core:', '')
            : pathfindingResult.core_error.type;
          error = t(`coreErrors.${translationKey}`, {
            defaultValue: pathfindingResult.core_error.message,
          });
        } else {
          error = t(`pathfindingErrors.${pathfindingResult.error_type}`);
        }
        pathfindingDispatch({
          type: 'PATHFINDING_ERROR',
          message: error,
        });
      } catch (e) {
        if (isObject(e)) {
          let error;
          if ('error' in e) {
            dispatch(setFailure(castErrorToFailure(e, { name: t('pathfinding') })));
            error = 'failedRequest';
          } else if ('data' in e && isObject(e.data) && 'message' in e.data) {
            error = e.data.message as string;
            if (e.data.message === 'Infra not loaded' || e.data.message === 'Invalid version') {
              setIsInfraError(true);
            }
          }
          pathfindingDispatch({ type: 'PATHFINDING_ERROR', message: error });
        }
      }
    };

    if (infra && infra.state === 'CACHED' && pathfindingState.mustBeLaunched) {
      startPathFinding();
    }
  }, [pathfindingState.mustBeLaunched, infra]);

  useEffect(() => setIsPathfindingInitialized(true), []);

  return {
    isPathfindingInitialized,
    pathfindingState,
    infraInfos: {
      infra,
      reloadCount,
    },
  };
};
