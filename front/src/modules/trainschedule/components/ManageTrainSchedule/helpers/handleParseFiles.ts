import { t } from 'i18next';
import type { Dispatch } from 'redux';

import type { ImportedTrainSchedule } from 'applications/operationalStudies/types';
import { type TrainScheduleBase } from 'common/api/osrdEditoastApi';
import { setFailure } from 'reducers/main';

export const handleFileReadingError = (error: Error) => {
  console.error('File reading error:', error);
};

export const processJsonFile = (
  fileContent: string,
  setTrainsJsonData: (data: TrainScheduleBase[]) => void
) => {
  const importedTrainSchedules: TrainScheduleBase[] = JSON.parse(fileContent);
  if (importedTrainSchedules && importedTrainSchedules.length > 0) {
    setTrainsJsonData(importedTrainSchedules);
  }
};

export const processXmlFile = async (
  fileContent: string,
  parseRailML: (xmlDoc: Document) => Promise<ImportedTrainSchedule[]>,
  updateTrainSchedules: (schedules: ImportedTrainSchedule[]) => void,
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

export const handleUnsupportedFileType = (dispatch: Dispatch) => {
  console.error('Unsupported file type');
  dispatch(
    setFailure({
      name: t('errorMessages.error'),
      message: t('errorMessages.errorUnsupportedFileType'),
    })
  );
};
