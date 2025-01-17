import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@osrd-project/ui-core';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import useStdcmTowedRollingStock from 'applications/stdcm/hooks/useStdcmTowedRollingStock';
import { extractMarkersInfo } from 'applications/stdcm/utils';
import {
  validateMaxSpeed,
  validateTotalLength,
  validateTotalMass,
} from 'applications/stdcm/utils/consistValidation';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import useInfraStatus from 'modules/pathfinding/hooks/useInfraStatus';
import { useStoreDataForRollingStockSelector } from 'modules/rollingStock/components/RollingStockSelector/useStoreDataForRollingStockSelector';
import NewMap from 'modules/trainschedule/components/ManageTrainSchedule/NewMap';
import { type StdcmConfSliceActions, resetMargins } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import type { OsrdStdcmConfState } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';

import StdcmConsist from './StdcmConsist';
import StdcmDestination from './StdcmDestination';
import StdcmLinkedTrainSearch from './StdcmLinkedTrainSearch';
import StdcmOrigin from './StdcmOrigin';
import useStdcmPathfinding from '../../hooks/useStdcmPathfinding';
import type { StdcmConfigErrors } from '../../types';
import StdcmSimulationParams from '../StdcmSimulationParams';
import StdcmVias from './StdcmVias';
import { ArrivalTimeTypes, StdcmConfigErrorTypes } from '../../types';
import checkStdcmConfigErrors from '../../utils/checkStdcmConfigErrors';
import StdcmLoader from '../StdcmLoader';
import StdcmWarningBox from '../StdcmWarningBox';

declare global {
  interface Window {
    osrdStdcmConfState?: OsrdStdcmConfState;
  }
}

/**
 * Inputs in different cards inside the StdcmConfig component come from the stdcm redux store.
 * SelectedSimulation is the simulation that is currently selected from the list of simulations.
 */
type StdcmConfigProps = {
  isDebugMode: boolean;
  isPending: boolean;
  launchStdcmRequest: () => Promise<void>;
  retainedSimulationIndex: number;
  showBtnToLaunchSimulation: boolean;
  cancelStdcmRequest: () => void;
};

const StdcmConfig = ({
  isDebugMode,
  isPending,
  launchStdcmRequest,
  retainedSimulationIndex,
  showBtnToLaunchSimulation,
  cancelStdcmRequest,
}: StdcmConfigProps) => {
  const { t } = useTranslation('stdcm');
  const launchButtonRef = useRef<HTMLDivElement>(null);

  const { infra } = useInfraStatus();
  const dispatch = useAppDispatch();
  const { updateStdcmPathStep, restoreStdcmConfig } = useOsrdConfActions() as StdcmConfSliceActions;

  const {
    getStdcmOrigin,
    getStdcmDestination,
    getStdcmPathSteps,
    getProjectID,
    getScenarioID,
    getStudyID,
    getTotalMass,
    getTotalLength,
    getMaxSpeed,
  } = useOsrdConfSelectors() as StdcmConfSelectors;
  const origin = useSelector(getStdcmOrigin);
  const pathSteps = useSelector(getStdcmPathSteps);
  const destination = useSelector(getStdcmDestination);
  const projectID = useSelector(getProjectID);
  const studyID = useSelector(getStudyID);
  const scenarioID = useSelector(getScenarioID);

  const totalMass = useSelector(getTotalMass);
  const totalLength = useSelector(getTotalLength);
  const maxSpeed = useSelector(getMaxSpeed);
  const { isPathfindingLoading, pathfinding } = useStdcmPathfinding(infra);

  const formRef = useRef<HTMLDivElement>(null);

  const [formErrors, setFormErrors] = useState<StdcmConfigErrors>();

  const { rollingStock } = useStoreDataForRollingStockSelector();
  const towedRollingStock = useStdcmTowedRollingStock();

  const consistErrors = useMemo(() => {
    const totalMassError = validateTotalMass({
      tractionEngineMass: rollingStock?.mass,
      towedMass: towedRollingStock?.mass,
      totalMass,
    });

    const totalLengthError = validateTotalLength({
      tractionEngineLength: rollingStock?.length,
      towedLength: towedRollingStock?.length,
      totalLength,
    });

    return {
      totalMass: totalMassError,
      totalLength: totalLengthError,
      maxSpeed: validateMaxSpeed(maxSpeed, rollingStock?.max_speed),
    };
  }, [rollingStock, towedRollingStock, totalMass, totalLength, maxSpeed]);

  const disabled = isPending || retainedSimulationIndex > -1;

  const markersInfo = useMemo(() => extractMarkersInfo(pathSteps), [pathSteps]);

  const startSimulation = () => {
    const isPathfindingFailed = !!pathfinding && pathfinding.status !== 'success';
    const formErrorsStatus = checkStdcmConfigErrors(isPathfindingFailed, pathSteps, t);
    if (pathfinding?.status === 'success' && !formErrorsStatus) {
      launchStdcmRequest();
    } else {
      // The console error is only for debugging the user tests (temporary)
      console.warn('The form is not valid:', { pathfinding, formErrorsStatus });
      setFormErrors(formErrorsStatus);
    }
  };

  const removeOriginArrivalTime = () => {
    dispatch(
      updateStdcmPathStep({ id: origin.id, updates: { arrivalType: ArrivalTimeTypes.ASAP } })
    );
  };
  const removeDestinationArrivalTime = () => {
    dispatch(
      updateStdcmPathStep({ id: destination.id, updates: { arrivalType: ArrivalTimeTypes.ASAP } })
    );
  };

  useEffect(() => {
    if (pathfinding) {
      const formErrorsStatus = checkStdcmConfigErrors(
        pathfinding.status !== 'success',
        pathSteps,
        t
      );
      setFormErrors(formErrorsStatus);
    }
  }, [pathfinding, pathSteps, t]);

  useEffect(() => {
    if (!isDebugMode) {
      dispatch(resetMargins());
    }
  }, [isDebugMode]);

  useEffect(() => {
    if (!infra || infra.state === 'CACHED') {
      setFormErrors(undefined);
    } else {
      setFormErrors({ errorType: StdcmConfigErrorTypes.INFRA_NOT_LOADED });
    }
  }, [infra]);

  useEffect(() => {
    const state = window.osrdStdcmConfState;
    if (state) {
      dispatch(restoreStdcmConfig(state));
    }
  }, []);

  return (
    <div className="stdcm__body">
      {isDebugMode && (
        <div className="stdcm-simulation-parameters">
          <StdcmSimulationParams {...{ disabled, projectID, studyID, scenarioID }} />
        </div>
      )}
      <div className="d-flex">
        <div className="d-flex flex-column">
          <StdcmLinkedTrainSearch
            disabled={disabled}
            linkedTrainType="anterior"
            linkedOpId={origin.id}
          />
          <div className="stdcm-simulation-inputs">
            <div className="stdcm-consist-container">
              <StdcmConsist
                consistErrors={consistErrors}
                disabled={disabled}
                isDebugMode={isDebugMode}
              />
            </div>
            <div className="stdcm__separator" />
            <div ref={formRef} className="stdcm-simulation-itinerary">
              <StdcmOrigin disabled={disabled} />
              <StdcmVias disabled={disabled} />
              <StdcmDestination disabled={disabled} />
              <StdcmLinkedTrainSearch
                disabled={disabled}
                linkedTrainType="posterior"
                linkedOpId={destination.id}
              />

              <div
                className={cx('stdcm-launch-request', {
                  'wizz-effect': pathfinding?.status !== 'success' || formErrors,
                })}
                ref={launchButtonRef}
              >
                <Button
                  data-testid="launch-simulation-button"
                  className={cx({
                    'fade-out': !showBtnToLaunchSimulation,
                  })}
                  label={t('simulation.getSimulation')}
                  onClick={startSimulation}
                  isDisabled={
                    disabled ||
                    !showBtnToLaunchSimulation ||
                    formErrors?.errorType === StdcmConfigErrorTypes.INFRA_NOT_LOADED
                  }
                />
                {formErrors && (
                  <StdcmWarningBox
                    errorInfos={formErrors}
                    removeOriginArrivalTime={removeOriginArrivalTime}
                    removeDestinationArrivalTime={removeDestinationArrivalTime}
                  />
                )}
              </div>

              {isPending && (
                <StdcmLoader
                  cancelStdcmRequest={cancelStdcmRequest}
                  launchButtonRef={launchButtonRef}
                  formRef={formRef}
                />
              )}
            </div>
          </div>
        </div>

        <div className="osrd-config-item-container osrd-config-item-container-map stdcm-map">
          <NewMap
            id="stdcm-map-config"
            hideAttribution
            hideItinerary
            isPathfindingLoading={isPathfindingLoading}
            preventPointSelection
            pathGeometry={pathfinding?.geometry}
            showStdcmAssets
            simulationPathSteps={markersInfo}
          />
        </div>
      </div>
    </div>
  );
};

export default StdcmConfig;
