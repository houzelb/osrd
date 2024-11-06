import { test as setup } from '@playwright/test';

import ROLLING_STOCK_NAMES, { globalProjectName, stdcmProjectName } from './assets/project-const';
import { createDataForTests } from './utils/setup-utils';
import { deleteProject, deleteRollingStocks } from './utils/teardown-utils';

setup('setup', async () => {
  console.info('Starting test data setup ...');
  await Promise.all([
    await deleteProject(stdcmProjectName),
    await deleteProject(globalProjectName),
    deleteRollingStocks(ROLLING_STOCK_NAMES),
  ]);
  await createDataForTests();
});
