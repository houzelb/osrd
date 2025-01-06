import { useCallback, useMemo } from 'react';

import { Rocket } from '@osrd-project/ui-icons';
import type { TFunction } from 'i18next';
import { keyBy } from 'lodash';
import { useTranslation } from 'react-i18next';

import type { ImportedTrainSchedule, Step } from 'applications/operationalStudies/types';
import {
  osrdEditoastApi,
  type LightRollingStockWithLiveries,
  type SearchResultItemOperationalPoint,
  type TrainScheduleBase,
  type TrainScheduleResult,
} from 'common/api/osrdEditoastApi';
import { Loader } from 'common/Loaders';
import { MAIN_OP_CH_CODES } from 'common/Map/Search/useSearchOperationalPoint';
import { ImportTrainScheduleTrainDetail } from 'modules/trainschedule/components/ImportTrainSchedule';
import rollingstockOpenData2OSRD from 'modules/trainschedule/components/ImportTrainSchedule/rollingstock_opendata2osrd.json';
import { setFailure, setSuccess } from 'reducers/main';
import { useAppDispatch } from 'store';

import { generateTrainSchedulesPayloads } from './generateTrainSchedulesPayloads';
import type { RollingstockOpenData2OSRDKeys } from './types';
import { findValidTrainNameKey } from '../ManageTrainSchedule/helpers/trainNameHelper';

function LoadingIfSearching({ isLoading, t }: { isLoading: boolean; t: TFunction }) {
  return (
    <h1 className="text-center text-muted my-5">
      {isLoading ? <Loader position="center" /> : `${t('noResults')}`}
    </h1>
  );
}

type ImportTrainScheduleTrainsListProps = {
  trainsList: ImportedTrainSchedule[];
  rollingStocks: LightRollingStockWithLiveries[];
  isLoading: boolean;
  timetableId: number;
  trainsJsonData: TrainScheduleBase[];
  trainsXmlData: ImportedTrainSchedule[];
  upsertTrainSchedules: (trainSchedules: TrainScheduleResult[]) => void;
};

const ImportTrainScheduleTrainsList = ({
  trainsList,
  rollingStocks,
  isLoading,
  timetableId,
  trainsJsonData,
  trainsXmlData,
  upsertTrainSchedules,
}: ImportTrainScheduleTrainsListProps) => {
  const { t } = useTranslation(['operationalStudies/importTrainSchedule']);
  const dispatch = useAppDispatch();

  const [postSearch] = osrdEditoastApi.endpoints.postSearch.useMutation();
  const [postTrainSchedule] =
    osrdEditoastApi.endpoints.postTimetableByIdTrainSchedule.useMutation();

  const rollingStockDict = useMemo(
    () => keyBy(rollingStocks, (rollingStock) => rollingStock.name),
    [rollingStocks]
  );

  const formattedTrainsList = useMemo(
    () =>
      trainsList.map(({ rollingStock, ...train }) => {
        if (!rollingStock) {
          return { ...train, rollingStock: '' };
        }

        const validTrainNameKey = findValidTrainNameKey(rollingStock);
        const validTrainName = validTrainNameKey
          ? rollingstockOpenData2OSRD[validTrainNameKey]
          : rollingStock;

        return { ...train, rollingStock: validTrainName };
      }),
    [trainsList]
  );

  const getStepsMainChCode = useCallback(
    async (steps: Step[]) => {
      const stepsQuery = ['or', ...steps.map((step) => ['=', ['uic'], Number(step.uic)])];
      const mainChCodeConstraint = [
        'or',
        ...MAIN_OP_CH_CODES.map((chCode) => ['=', ['ch'], chCode]),
      ];

      try {
        const payloadSteps = {
          object: 'operationalpoint',
          query: ['and', stepsQuery, mainChCodeConstraint],
        };
        const stepsDetails = (await postSearch({
          searchPayload: payloadSteps,
          pageSize: 25,
        }).unwrap()) as SearchResultItemOperationalPoint[];

        const stepsChCodeByUIC = stepsDetails.reduce<{ [key: number]: string }>((acc, step) => {
          acc[step.uic] = step.ch;
          return acc;
        }, {});

        return stepsChCodeByUIC;
      } catch (error) {
        console.error('Failed to fetch operational points:', error);
        return undefined;
      }
    },
    [postSearch]
  );

  async function generateTrainSchedules() {
    try {
      let payloads;

      if (trainsXmlData.length > 0) {
        const uicToMainChCodes = await getStepsMainChCode(trainsXmlData[0].steps);
        payloads = generateTrainSchedulesPayloads(trainsXmlData, uicToMainChCodes);
      } else if (trainsJsonData.length > 0) {
        payloads = trainsJsonData;
      } else {
        const uicToMainChCodes = await getStepsMainChCode(formattedTrainsList[0].steps);
        payloads = generateTrainSchedulesPayloads(formattedTrainsList, uicToMainChCodes, false);
      }

      const trainSchedules = await postTrainSchedule({ id: timetableId, body: payloads }).unwrap();
      upsertTrainSchedules(trainSchedules);
      dispatch(
        setSuccess({
          title: t('success'),
          text: t('status.successfulImport', {
            trainsList,
            count: trainsList.length || trainsJsonData.length,
          }),
        })
      );
    } catch (error) {
      dispatch(
        setFailure({
          name: t('failure'),
          message: t('status.invalidTrainSchedules', {
            trainsList,
            count: trainsList.length || trainsJsonData.length,
          }),
        })
      );
      throw error;
    }
  }

  return trainsList.length > 0 || trainsJsonData.length > 0 ? (
    <div className="container-fluid mb-2">
      <div className="osrd-config-item-container import-train-schedule-trainlist">
        <div className="import-train-schedule-trainlist-launchbar">
          <span className="import-train-schedule-trainlist-launchbar-nbresults">
            {trainsList.length > 0 ? trainsList.length : trainsJsonData.length} {t('trainsFound')}
          </span>
          <button
            className="btn btn-primary btn-sm ml-auto"
            type="button"
            onClick={() => generateTrainSchedules()}
          >
            <Rocket />
            <span className="ml-3">{t('launchImport')}</span>
          </button>
        </div>
        {trainsList.length > 0 && (
          <div className="import-train-schedule-trainlist-results">
            {trainsList.map((train, idx) => (
              <ImportTrainScheduleTrainDetail
                trainData={train}
                idx={idx}
                key={train.trainNumber}
                rollingStock={
                  rollingStockDict[
                    rollingstockOpenData2OSRD[train.rollingStock as RollingstockOpenData2OSRDKeys]
                  ]
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="container-fluid pb-2">
      <div className="osrd-config-item-container">
        <LoadingIfSearching isLoading={isLoading} t={t} />
      </div>
    </div>
  );
};

export default ImportTrainScheduleTrainsList;
