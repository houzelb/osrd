import { useState, useEffect } from 'react';

import { compact, isObject } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { useScenarioContext } from 'applications/operationalStudies/hooks/useScenarioContext';
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import type {
  IncompatibleConstraints,
  PathfindingInputError,
  PathfindingResultSuccess,
  PostInfraByInfraIdPathPropertiesApiArg,
} from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import type { PathfindingState2 } from 'modules/pathfinding/types';
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

const initialPathfindingState: PathfindingState2 = {
  isRunning: false,
  isDone: false,
  missingParam: false,
};

export const usePathfinding = (
  setPathProperties: (pathProperties?: ManageTrainSchedulePathProperties) => void
) => {
  const { t } = useTranslation(['operationalStudies/manageTrainSchedule']);
  const dispatch = useAppDispatch();
  const { getPathSteps, getPowerRestriction, getShouldLaunchPathfinding } = useOsrdConfSelectors();
  const pathSteps = useSelector(getPathSteps);
  const powerRestrictions = useSelector(getPowerRestriction);
  const shoudlLaunchPathfinding = useSelector(getShouldLaunchPathfinding);

  const { infra, reloadCount, setIsInfraError } = useInfraStatus();
  const { rollingStock } = useStoreDataForRollingStockSelector();

  const [pathfindingState, setPathfindingState] = useState(initialPathfindingState);

  const [postPathfindingBlocks] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathfindingBlocks.useMutation();
  const [postPathProperties] =
    osrdEditoastApi.endpoints.postInfraByInfraIdPathProperties.useMutation();

  const { updatePathSteps, resetShouldLaunchPathfinding } = useOsrdConfActions();
  const { infraId } = useScenarioContext();

  const setRunning = () => {
    setPathProperties(undefined);
    setPathfindingState({ ...initialPathfindingState, isRunning: true });
  };

  const setIsDone = () => {
    setPathfindingState({ ...initialPathfindingState, isDone: true });
  };

  const setError = (errorMessage?: string) => {
    setPathfindingState({ ...initialPathfindingState, error: errorMessage });
  };

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

      dispatch(updatePathSteps({ pathSteps: updatedPathSteps }));
    } else {
      dispatch(setFailure({ name: t('pathfindingError'), message: t('missingPathSteps') }));
    }
  };

  useEffect(() => {
    const enhancePathSteps = async (
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

      // We update existing pathsteps with coordinates, positionOnPath and kp
      // corresponding to the new pathfinding result
      const updatedPathSteps = pathSteps.map((step, i) => {
        if (!step) return step;

        const correspondingOp = suggestedOperationalPoints.find((suggestedOp) =>
          matchPathStepAndOp(step, suggestedOp)
        );

        const theoreticalMargin = i === 0 ? step.theoreticalMargin || '0%' : step.theoreticalMargin;
        const stopFor = i === pathSteps.length - 1 && !step.stopFor ? '0' : step.stopFor;

        return {
          ...step,
          positionOnPath: pathResult.path_item_positions[i],
          stopFor,
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
      dispatch(
        updatePathSteps({
          pathSteps: updatedPathSteps,
          options: { resetPowerRestrictions: true, shouldNotLaunchPathfinding: true },
        })
      );

      const allWaypoints = upsertPathStepsInOPs(
        suggestedOperationalPoints,
        compact(updatedPathSteps)
      );

      setPathProperties({
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
      dispatch(resetShouldLaunchPathfinding());

      setRunning();
      const pathfindingInput = getPathfindingQuery({
        infraId,
        rollingStock,
        pathSteps,
      });
      if (!pathfindingInput) {
        setPathfindingState({ ...initialPathfindingState, missingParam: true });
        return;
      }

      try {
        const pathfindingResult = await postPathfindingBlocks(pathfindingInput).unwrap();

        if (pathfindingResult.status === 'success') {
          await enhancePathSteps(pathfindingResult);
          setIsDone();
          return;
        }

        const hasInvalidPathItems =
          pathfindingResult.failed_status === 'pathfinding_input_error' &&
          pathfindingResult.error_type === 'invalid_path_items';
        if (hasInvalidPathItems) {
          handleInvalidPathItems(pathSteps, pathfindingResult.items);
          return;
        }

        const incompatibleConstraintsCheck =
          pathfindingResult.failed_status === 'pathfinding_not_found' &&
          pathfindingResult.error_type === 'incompatible_constraints';
        if (incompatibleConstraintsCheck) {
          await enhancePathSteps(
            pathfindingResult.relaxed_constraints_path,
            pathfindingResult.incompatible_constraints
          );
          setError(t(`pathfindingErrors.${pathfindingResult.error_type}`));
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
        setError(error);
      } catch (e) {
        if (isObject(e)) {
          let error: string | undefined;
          if ('error' in e) {
            dispatch(setFailure(castErrorToFailure(e, { name: t('pathfinding') })));
            error = 'failedRequest';
          } else if ('data' in e && isObject(e.data) && 'message' in e.data) {
            error = e.data.message as string;
            if (e.data.message === 'Infra not loaded' || e.data.message === 'Invalid version') {
              setIsInfraError(true);
            }
          }
          setError(error);
        }
      }
    };

    if (infra && infra.state === 'CACHED' && shoudlLaunchPathfinding) {
      startPathFinding();
    }
  }, [shoudlLaunchPathfinding, infra]);

  return {
    pathfindingState,
    infraInfos: {
      infra,
      reloadCount,
    },
  };
};
