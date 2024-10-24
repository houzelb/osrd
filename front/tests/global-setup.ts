import { test as setup } from '@playwright/test';

import ROLLING_STOCK_NAMES, { infrastructureName, globalProjectName } from './assets/project_const';
import { createDataForTests } from './utils/setup-utils';
import { deleteInfra, deleteProject, deleteRollingStocks } from './utils/teardown-utils';

setup('setup', async () => {
  console.info('Starting test data setup ...');
  await Promise.all([
    deleteInfra(infrastructureName),
    deleteProject(globalProjectName),
    deleteRollingStocks(ROLLING_STOCK_NAMES),
  ]);
  await createDataForTests();
});
