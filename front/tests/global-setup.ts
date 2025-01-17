import { test as setup } from '@playwright/test';

import ROLLING_STOCK_NAMES, {
  globalProjectName,
  trainScheduleProjectName,
} from './assets/project-const';
import { logger } from './logging-fixture';
import HomePage from './pages/home-page-model';
import { getStdcmEnvironment } from './utils/api-setup';
import { createDataForTests } from './utils/setup-utils';
import { deleteProject, deleteRollingStocks } from './utils/teardown-utils';

setup('setup', async ({ page }) => {
  const stdcmEnvironment = await getStdcmEnvironment();
  if (stdcmEnvironment) {
    process.env.STDCM_ENVIRONMENT = JSON.stringify(stdcmEnvironment);
  }

  logger.info('Starting test data setup ...');

  await deleteProject(trainScheduleProjectName);
  await deleteProject(globalProjectName);
  await deleteRollingStocks(ROLLING_STOCK_NAMES);

  await createDataForTests();

  logger.info('Retrieving project language ...');
  const homePage = new HomePage(page);
  await homePage.goToHomePage();
  process.env.PROJECT_LANGUAGE = await homePage.getOSRDLanguage();

  logger.info('Test data setup completed successfully.');
});
