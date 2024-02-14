import { test, expect } from '@playwright/test';
import StdcmPage from './pages/stdcm-page-model';
import manageTrainScheduleTranslation from '../public/locales/fr/operationalStudies/manageTrainSchedule.json';

import project from './assets/operationStudies/project.json';
import study from './assets/operationStudies/study.json';
import scenario from './assets/operationStudies/scenario.json';

const projectName = project.name;
const studyName = study.name;
const scenarioName = scenario.name;
const rollingStockName = 'rollingstock_1500_25000_test_e2e';

const rollingStockTranslation = manageTrainScheduleTranslation.rollingstock;

test.describe('STDCM page (enabled)', () => {
  test('should correctly display the rolling stock list and select one', async ({ page }) => {
    const stdcmPage = new StdcmPage(page);

    await stdcmPage.navigateToPage();
    await expect(stdcmPage.scenarioExplorerModal).not.toBeVisible();
    await expect(stdcmPage.rollingStockSelectorModal).not.toBeVisible();

    // Open the scenario explorer and select project, study and scenario
    await stdcmPage.openScenarioExplorer();
    await stdcmPage.selectMiniCard(projectName);
    await stdcmPage.selectMiniCard(studyName);
    await stdcmPage.selectMiniCard(scenarioName);

    // Check no rollingstock is selected and "rollingstock" is in the missing information
    await expect(stdcmPage.missingParams).toContainText(rollingStockTranslation);

    // Select a rolling stock
    await stdcmPage.openRollingstockModal();
    await expect(stdcmPage.rollingStockSelectorModal).toBeVisible();
    await stdcmPage.selectRollingStock(rollingStockName);

    // Check that the rollingstock is selected and "rollingstock" is not in the missing information anymore
    await expect(stdcmPage.rollingStockSelectorModal).not.toBeVisible();
    await expect(stdcmPage.missingParams).not.toContainText(rollingStockTranslation);

    await stdcmPage.backToHomePage();
  });
});
