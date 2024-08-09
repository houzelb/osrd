import React from 'react';

import { Alert, Pencil, Trash, Clock, Flame } from '@osrd-project/ui-icons';
import cx from 'classnames';
import { omit } from 'lodash';
import { useTranslation } from 'react-i18next';
import { GiPathDistance } from 'react-icons/gi';
import { MdAvTimer, MdContentCopy } from 'react-icons/md';
import nextId from 'react-id-generator';

import { MANAGE_TRAIN_SCHEDULE_TYPES } from 'applications/operationalStudies/consts';
import invalidInfra from 'assets/pictures/components/missing_tracks.svg';
import invalidRollingStock from 'assets/pictures/components/missing_train.svg';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import type { TrainScheduleBase, TrainScheduleResult } from 'common/api/osrdEditoastApi';
import RollingStock2Img from 'modules/rollingStock/components/RollingStock2Img';
import trainNameWithNum from 'modules/trainschedule/components/ManageTrainSchedule/helpers/trainNameHelper';
import { setFailure, setSuccess } from 'reducers/main';
import {
  updateTrainIdUsedForProjection,
  updateSelectedTrainId,
} from 'reducers/osrdsimulation/actions';
import { useAppDispatch } from 'store';
import {
  formatToIsoDate,
  isoDateToMs,
  serializeDateTimeWithoutYear,
  parseDateTime,
} from 'utils/date';
import { castErrorToFailure } from 'utils/error';
import { sec2time } from 'utils/timeManipulation';

import type { InvalidReason, TrainScheduleWithDetails } from './types';

type TimetableTrainCardProps = {
  isSelectable: boolean;
  isInSelection: boolean;
  train: TrainScheduleWithDetails;
  intervalPosition?: number;
  isSelected: boolean;
  isModified?: boolean;
  projectionPathIsUsed: boolean;
  idx: number;
  handleSelectTrain: (trainId: number) => void;
  setDisplayTrainScheduleManagement: (arg0: string) => void;
  upsertTrainSchedules: (trainSchedules: TrainScheduleResult[]) => void;
  setTrainIdToEdit: (trainIdToEdit?: number) => void;
  removeTrains: (trainIds: number[]) => void;
};

const TimetableTrainCard = ({
  isSelectable,
  isInSelection,
  train,
  intervalPosition,
  isSelected,
  isModified,
  projectionPathIsUsed,
  idx,
  setDisplayTrainScheduleManagement,
  handleSelectTrain,
  upsertTrainSchedules,
  setTrainIdToEdit,
  removeTrains,
}: TimetableTrainCardProps) => {
  const { t } = useTranslation(['operationalStudies/scenario']);
  const dispatch = useAppDispatch();
  const [postTrainSchedule] =
    osrdEditoastApi.endpoints.postTimetableByIdTrainSchedule.useMutation();
  const [getTrainSchedule] = osrdEditoastApi.endpoints.postTrainSchedule.useLazyQuery();
  const [deleteTrainSchedule] = osrdEditoastApi.endpoints.deleteTrainSchedule.useMutation();

  const changeSelectedTrainId = (trainId: number) => {
    dispatch(updateSelectedTrainId(trainId));
  };

  const editTrainSchedule = () => {
    setTrainIdToEdit(train.id);
    setDisplayTrainScheduleManagement(MANAGE_TRAIN_SCHEDULE_TYPES.edit);
  };

  const deleteTrain = async () => {
    if (isSelected) {
      // we need to set selectedTrainId to undefined, otherwise just after the delete,
      // some unvalid rtk calls are dispatched (see rollingstock request in SimulationResults)
      dispatch(updateSelectedTrainId(undefined));
    }

    deleteTrainSchedule({ body: { ids: [train.id] } })
      .unwrap()
      .then(() => {
        removeTrains([train.id]);
        dispatch(
          setSuccess({
            title: t('timetable.trainDeleted', { name: train.trainName }),
            text: '',
          })
        );
      })
      .catch((e) => {
        dispatch(setFailure(castErrorToFailure(e)));
        if (isSelected) {
          dispatch(updateSelectedTrainId(train.id));
        }
      });
  };

  const duplicateTrain = async () => {
    // Static for now, will be dynamic when UI will be ready
    const trainName = `${train.trainName} (${t('timetable.copy')})`;
    const trainDelta = 5;
    const trainCount = 1;
    const actualTrainCount = 1;

    const trainsResults = await getTrainSchedule({ body: { ids: [train.id] } })
      .unwrap()
      .catch((e) => {
        dispatch(setFailure(castErrorToFailure(e)));
      });

    if (trainsResults) {
      const trainDetail = trainsResults[0];
      const formattedStartTimeMs = isoDateToMs(trainDetail.start_time);
      const newStartTimeString = formatToIsoDate(formattedStartTimeMs + 1000 * 60 * trainDelta);
      const newTrain: TrainScheduleBase = {
        ...omit(trainDetail, ['id', 'timetable_id']),
        start_time: newStartTimeString,
        train_name: trainNameWithNum(trainName, actualTrainCount, trainCount),
      };

      try {
        const [trainScheduleResult] = await postTrainSchedule({
          id: trainDetail.timetable_id,
          body: [newTrain],
        }).unwrap();
        upsertTrainSchedules([trainScheduleResult]);
        dispatch(
          setSuccess({
            title: t('timetable.trainAdded'),
            text: `${trainName}`,
          })
        );
      } catch (e) {
        dispatch(setFailure(castErrorToFailure(e)));
      }
    }
  };

  const selectPathProjection = async () => {
    dispatch(updateTrainIdUsedForProjection(train.id));
  };

  const getInvalidIcon = (invalidReason: InvalidReason) => {
    switch (invalidReason) {
      case 'rolling_stock_not_found':
        return <img src={invalidRollingStock} alt="Invalid rollingstock logo" />;
      case 'pathfinding_failed':
        return <img src={invalidInfra} alt="Invalid infra logo" className="infra-logo" />;
      default:
        return <Alert />;
    }
  };

  function formatDateTimeWithoutYear(dateTimeStr: string) {
    const parsedDate = parseDateTime(dateTimeStr);
    return parsedDate ? serializeDateTimeWithoutYear(parsedDate) : '';
  }

  return (
    <div className="scenario-timetable-train-with-right-bar">
      <div
        data-testid="scenario-timetable-train"
        className={cx(
          'scenario-timetable-train with-colored-border',
          `colored-border-${intervalPosition}`,
          {
            selected: isSelected,
            modified: isModified,
            invalid: train.invalidReason,
            'in-selection': isInSelection,
          }
        )}
      >
        {isSelectable && (
          <input
            type="checkbox"
            className="mr-2"
            checked={isInSelection}
            onChange={() => handleSelectTrain(train.id)}
          />
        )}
        <div
          data-testid="scenario-timetable-train-button"
          className="scenario-timetable-train-container"
          role="button"
          tabIndex={0}
          onClick={() => changeSelectedTrainId(train.id)}
        >
          <div className="scenario-timetable-train-header">
            <div className="scenario-timetable-train-name">
              <div
                className={cx('scenario-timetable-train-idx', {
                  projected: projectionPathIsUsed,
                })}
              >
                {idx + 1}
              </div>
              {train.invalidReason && (
                <div
                  className="mr-1 scenario-timetable-train-invalid-icons"
                  title={train.invalidReason}
                >
                  {getInvalidIcon(train.invalidReason)}
                </div>
              )}
              <div className="train-name" title={train.trainName}>
                {train.trainName}
              </div>
              {train.rollingStock && (
                <span className="img-container">
                  <RollingStock2Img rollingStock={train.rollingStock} />
                </span>
              )}
            </div>
            <div
              className={cx('scenario-timetable-train-times', {
                'not-honored': train.notHonoredReason === 'scheduleNotHonored',
                'too-fast': train.notHonoredReason === 'trainTooFast',
              })}
            >
              {train.notHonoredReason === 'scheduleNotHonored' && (
                <div className="ml-1">
                  <Clock size="lg" />
                </div>
              )}
              {train.notHonoredReason === 'trainTooFast' && (
                <div className="ml-1">
                  <Flame size="lg" />
                </div>
              )}
              <div>
                <div className="scenario-timetable-train-departure">
                  {formatDateTimeWithoutYear(train.startTime)}
                </div>
                <div className="scenario-timetable-train-arrival" title={train.arrivalTime}>
                  {formatDateTimeWithoutYear(train.arrivalTime)}
                </div>
              </div>
            </div>
          </div>
          <div className="scenario-timetable-train-body">
            {train.speedLimitTag && <span className="flex-grow-1">{train.speedLimitTag}</span>}
            <span className="mr-3">{t('timetable.stopsCount', { count: train.stopsCount })} </span>
            <small
              className="mx-xl-2 mr-lg-2 text-orange font-weight-bold"
              data-testid="allowance-energy-consumed"
            >
              {train.mechanicalEnergyConsumed}&nbsp;kWh
            </small>

            <span className="mr-xl-3 mr-lg-2">{train.pathLength}</span>

            <div className="text-nowrap text-right">
              <MdAvTimer />
              <span className="ml-1" data-testid="train-duration">
                {sec2time(train.duration / 1000)}
              </span>
            </div>
          </div>
          {train.labels.length > 0 && (
            <div className="scenario-timetable-train-tags">
              {train.labels.map((tag) => (
                <div className="scenario-timetable-train-tags-tag" key={nextId()}>
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="scenario-timetable-train-buttons">
          <button
            className="scenario-timetable-train-buttons-selectprojection"
            type="button"
            aria-label={t('timetable.choosePath')}
            title={t('timetable.choosePath')}
            onClick={selectPathProjection}
          >
            <GiPathDistance />
          </button>
          <button
            className="scenario-timetable-train-buttons-duplicate"
            type="button"
            aria-label={t('timetable.duplicate')}
            title={t('timetable.duplicate')}
            onClick={duplicateTrain}
          >
            <MdContentCopy />
          </button>
          <button
            className="scenario-timetable-train-buttons-update"
            type="button"
            aria-label={t('timetable.update')}
            title={t('timetable.update')}
            onClick={editTrainSchedule}
            data-testid="edit-train"
          >
            <Pencil />
          </button>
          <button
            className="scenario-timetable-train-buttons-delete"
            type="button"
            aria-label={t('timetable.delete')}
            title={t('timetable.delete')}
            onClick={deleteTrain}
          >
            <Trash />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimetableTrainCard);