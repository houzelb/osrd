import type { Scenario, Project, Study, Infra } from 'common/api/osrdEditoastApi';

import {
  trainScheduleProjectName,
  trainScheduleScenarioName,
  trainScheduleStudyName,
} from './assets/project-const';
import HomePage from './pages/home-page-model';
import OperationalStudiesTimetablePage from './pages/op-timetable-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra, getProject, getScenario, getStudy } from './utils/api-setup';

test.describe('Verify train schedule elements and filters', () => {
  test.slow();
  let project: Project;
  let study: Study;
  let scenario: Scenario;
  let infra: Infra;
  let OSRDLanguage: string;

  // Constants for expected train counts
  const TOTAL_TRAINS = 21;
  const VALID_TRAINS = 17;
  const INVALID_TRAINS = 4;
  const HONORED_TRAINS = 13;
  const NOT_HONORED_TRAINS = 4;
  const VALID_AND_HONORED_TRAINS = 13;
  const INVALID_AND_NOT_HONORED_TRAINS = 0;
  test.beforeAll('Fetch project, study and scenario with train schedule', async () => {
    project = await getProject(trainScheduleProjectName);
    study = await getStudy(project.id, trainScheduleStudyName);
    scenario = await getScenario(project.id, study.id, trainScheduleScenarioName);
    infra = await getInfra();
  });

  test.beforeEach('Navigate to scenario page before each test', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto(
      `/operational-studies/projects/${project.id}/studies/${study.id}/scenarios/${scenario.id}`
    );
    // Wait for infra to be in 'CACHED' state before proceeding
    await waitForInfraStateToBeCached(infra.id);
  });

  /** *************** Test 1 **************** */
  test('Loading trains and verifying simulation result', async ({ page }) => {
    const opTimetablePage = new OperationalStudiesTimetablePage(page);

    // Verify train count, invalid train messages, and train simulation results
    await opTimetablePage.verifyTrainCount(TOTAL_TRAINS);
    await opTimetablePage.verifyInvalidTrainsMessageVisibility(OSRDLanguage);
    await opTimetablePage.checkSelectedTimetableTrain();
    await opTimetablePage.filterValidityAndVerifyTrainCount(OSRDLanguage, 'Valid', VALID_TRAINS);
    await opTimetablePage.verifyEachTrainSimulation();
  });

  /** *************** Test 2 **************** */
  test('Filtering imported trains', async ({ page }) => {
    const opTimetablePage = new OperationalStudiesTimetablePage(page);

    // Verify train count and apply different filters for validity and honored status
    await opTimetablePage.verifyTrainCount(TOTAL_TRAINS);
    await opTimetablePage.filterValidityAndVerifyTrainCount(
      OSRDLanguage,
      'Invalid',
      INVALID_TRAINS
    );
    await opTimetablePage.filterValidityAndVerifyTrainCount(OSRDLanguage, 'All', TOTAL_TRAINS);
    await opTimetablePage.filterHonoredAndVerifyTrainCount(OSRDLanguage, 'Honored', HONORED_TRAINS);
    await opTimetablePage.filterValidityAndVerifyTrainCount(
      OSRDLanguage,
      'Valid',
      VALID_AND_HONORED_TRAINS
    );
    await opTimetablePage.filterHonoredAndVerifyTrainCount(
      OSRDLanguage,
      'Not honored',
      NOT_HONORED_TRAINS
    );
    await opTimetablePage.filterValidityAndVerifyTrainCount(
      OSRDLanguage,
      'Invalid',
      INVALID_AND_NOT_HONORED_TRAINS
    );
    await opTimetablePage.filterHonoredAndVerifyTrainCount(OSRDLanguage, 'All', INVALID_TRAINS);
    await opTimetablePage.filterValidityAndVerifyTrainCount(OSRDLanguage, 'All', TOTAL_TRAINS);

    // Verify train composition filters with predefined filter codes and expected counts
    const compositionFilters = [
      { code: 'MA100', count: 7 },
      { code: 'HLP', count: 3 },
      { code: 'E32C', count: 1 },
      { code: null, count: 10 }, // Null means no specific code applied
    ];

    for (const filter of compositionFilters) {
      await opTimetablePage.clickCodeCompoTrainFilterButton(
        OSRDLanguage,
        filter.code,
        filter.count
      );
    }
  });
});
