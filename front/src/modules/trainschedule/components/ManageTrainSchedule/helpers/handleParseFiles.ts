import type { TFunction } from 'i18next';
import type { Dispatch } from 'redux';

import type { ImportedTrainSchedule } from 'applications/operationalStudies/types';
import { type TrainScheduleBase } from 'common/api/osrdEditoastApi';
import { setFailure } from 'reducers/main';

export const handleFileReadingError = (error: Error) => {
  console.error('File reading error:', error);
};

const TRAIN_SCHEDULE_COMPULSORY_KEYS: (keyof TrainScheduleBase)[] = [
  'constraint_distribution',
  'path',
  'rolling_stock_name',
  'start_time',
  'train_name',
];

const validateTrainSchedules = (
  importedTrainSchedules: Partial<TrainScheduleBase>[]
): TrainScheduleBase[] => {
  const isInvalidTrainSchedules = importedTrainSchedules.some((trainSchedule) => {
    if (
      TRAIN_SCHEDULE_COMPULSORY_KEYS.some((key) => !(key in trainSchedule)) ||
      !Array.isArray(trainSchedule.path)
    ) {
      return true;
    }
    const hasInvalidSteps = trainSchedule.path.some((step) => !('id' in step));
    return hasInvalidSteps;
  });

  if (isInvalidTrainSchedules) {
    throw new Error('Invalid train schedules: some compulsory keys are missing');
  }
  return importedTrainSchedules as TrainScheduleBase[];
};

export const processJsonFile = (
  fileContent: string,
  fileExtension: string,
  setTrainsJsonData: (data: TrainScheduleBase[]) => void,
  dispatch: Dispatch,
  t: TFunction
) => {
  const isJsonFile = fileExtension === 'application/json';

  // try to parse the file content
  let rawContent: Partial<TrainScheduleBase>[];
  try {
    rawContent = JSON.parse(fileContent);
  } catch {
    if (isJsonFile) {
      dispatch(
        setFailure({
          name: t('errorMessages.error'),
          message: t('errorMessages.errorInvalidFile'),
        })
      );
    }
    return isJsonFile;
  }

  // validate the trainSchedules
  try {
    const importedTrainSchedules = validateTrainSchedules(rawContent);
    if (importedTrainSchedules.length > 0) {
      setTrainsJsonData(importedTrainSchedules);
    } else {
      dispatch(
        setFailure({
          name: t('errorMessages.error'),
          message: t('errorMessages.errorEmptyFile'),
        })
      );
    }
  } catch {
    dispatch(
      setFailure({
        name: t('errorMessages.error'),
        message: t('errorMessages.errorInvalidFile'),
      })
    );
  }

  // file has been parsed successfully
  return true;
};

export const processXmlFile = async (
  fileContent: string,
  parseRailML: (xmlDoc: Document) => Promise<ImportedTrainSchedule[]>,
  updateTrainSchedules: (schedules: ImportedTrainSchedule[]) => void
) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(fileContent, 'application/xml');
  const parserError = xmlDoc.getElementsByTagName('parsererror');

  if (parserError.length > 0) {
    throw new Error('Invalid XML');
  }

  const importedTrainSchedules = await parseRailML(xmlDoc);
  if (importedTrainSchedules && importedTrainSchedules.length > 0) {
    updateTrainSchedules(importedTrainSchedules);
  }
};
