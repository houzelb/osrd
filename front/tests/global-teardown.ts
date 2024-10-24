import { test as teardown } from '@playwright/test';

import ROLLING_STOCK_NAMES, { infrastructureName, globalProjectName } from './assets/project_const';
import { deleteInfra, deleteProject, deleteRollingStocks } from './utils/teardown-utils';

teardown('teardown', async () => {
  try {
    await Promise.all([
      deleteInfra(infrastructureName),
      deleteProject(globalProjectName),
      deleteRollingStocks(ROLLING_STOCK_NAMES),
    ]);
    console.info('Test data teardown completed successfully.');
  } catch (error) {
    console.error('Error during test data teardown:', error);
  }
});
