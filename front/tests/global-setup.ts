import { test as setup } from '@playwright/test';

import ROLLING_STOCK_NAMES, {
  globalProjectName,
  trainScheduleProjectName,
} from './assets/project-const';
import { getStdcmEnvironment } from './utils/api-setup';
import { createDataForTests } from './utils/setup-utils';
import { deleteProject, deleteRollingStocks } from './utils/teardown-utils';

setup('setup', async () => {
  const stdcmEnvironment = await getStdcmEnvironment();
  if (stdcmEnvironment) {
    process.env.STDCM_ENVIRONMENT = JSON.stringify(stdcmEnvironment);
  }

  console.info('Starting test data setup ...');

  await deleteProject(trainScheduleProjectName);
  await deleteProject(globalProjectName);
  await deleteRollingStocks(ROLLING_STOCK_NAMES);

  await createDataForTests();
  console.info('Test data setup completed successfully.');
});
