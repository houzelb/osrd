import fs from 'fs';

import { test as teardown } from '@playwright/test';

import ROLLING_STOCK_NAMES, {
  globalProjectName,
  trainScheduleProjectName,
} from './assets/project-const';
import { setStdcmEnvironment } from './utils/api-setup';
import { deleteProject, deleteRollingStocks } from './utils/teardown-utils';

teardown('teardown', async ({ browser }) => {
  try {
    console.info('Starting test data teardown...');

    // Delete projects and rolling stocks
    await deleteProject(trainScheduleProjectName);
    await deleteProject(globalProjectName);
    await deleteRollingStocks(ROLLING_STOCK_NAMES);

    // Delete saved files in the results directory
    fs.rmSync('./tests/stdcm-results', { recursive: true, force: true });
    console.info('All downloaded files have been removed from the results directory.');

    // Close all browser contexts
    await Promise.all(browser.contexts().map((context) => context.close()));
    console.info('All browser contexts closed successfully.');

    // Restore STDCM environment
    const savedEnvironment = process.env.STDCM_ENVIRONMENT
      ? JSON.parse(process.env.STDCM_ENVIRONMENT)
      : null;

    if (savedEnvironment) {
      await setStdcmEnvironment(savedEnvironment);
      console.info('STDCM environment restored successfully.');
    } else {
      console.warn('No STDCM environment to restore.');
    }

    console.info('Test data teardown completed successfully.');
  } catch (error) {
    console.error('Error during test data teardown:', error);
  }
});
