import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@osrd-project/ui-core';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { extractMarkersInfo } from 'applications/stdcm/utils';
import { useOsrdConfActions, useOsrdConfSelectors } from 'common/osrdContext';
import useInfraStatus from 'modules/pathfinding/hooks/useInfraStatus';
import { Map } from 'modules/trainschedule/components/ManageTrainSchedule';
import { type StdcmConfSliceActions, resetMargins } from 'reducers/osrdconf/stdcmConf';
import type { StdcmConfSelectors } from 'reducers/osrdconf/stdcmConf/selectors';
import { useAppDispatch } from 'store';

import StdcmConsist from './StdcmConsist';
import StdcmDestination from './StdcmDestination';
import StdcmLinkedTrainSearch from './StdcmLinkedTrainSearch';
import StdcmOrigin from './StdcmOrigin';
import useStaticPathfinding from '../../hooks/useStaticPathfinding';
import type { StdcmConfigErrors } from '../../types';
import StdcmSimulationParams from '../StdcmSimulationParams';
import StdcmVias from './StdcmVias';
import { ArrivalTimeTypes, StdcmConfigErrorTypes } from '../../types';
import checkStdcmConfigErrors from '../../utils/checkStdcmConfigErrors';
import StdcmLoader from '../StdcmLoader';
import StdcmWarningBox from '../StdcmWarningBox';

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
  const { updateStdcmPathStep, resetStdcmConfig } = useOsrdConfActions() as StdcmConfSliceActions;

  const {
    getStdcmOrigin,
    getStdcmDestination,
    getStdcmPathSteps,
    getProjectID,
    getScenarioID,
    getStudyID,
  } = useOsrdConfSelectors() as StdcmConfSelectors;
  const origin = useSelector(getStdcmOrigin);
  const pathSteps = useSelector(getStdcmPathSteps);
  const destination = useSelector(getStdcmDestination);
  const projectID = useSelector(getProjectID);
  const studyID = useSelector(getStudyID);
  const scenarioID = useSelector(getScenarioID);

  const pathfinding = useStaticPathfinding(infra);
  const formRef = useRef<HTMLDivElement>(null);

  const [formErrors, setFormErrors] = useState<StdcmConfigErrors>();

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
  }, [pathfinding]);

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
    const keepForm = localStorage.getItem('keepForm');

    if (!keepForm) {
      dispatch(resetStdcmConfig());
    } else {
      localStorage.removeItem('keepForm');
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
              <StdcmConsist disabled={disabled} />
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
          <Map
            hideAttribution
            hideItinerary
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
