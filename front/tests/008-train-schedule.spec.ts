import type { Scenario, Project, Study } from 'common/api/osrdEditoastApi';

import HomePage from './pages/home-page-model';
import OperationalStudiesTimetablePage from './pages/op-timetable-page-model';
import OperationalStudiesPage from './pages/operational-studies-page-model';
import test from './test-logger';
import { readJsonFile } from './utils';
import createScenario from './utils/scenario';
import { deleteScenario } from './utils/teardown-utils';
import { sendTrainSchedules } from './utils/trainSchedule';

test.describe('Verify train schedule elements and filters', () => {
  test.slow();
  let project: Project;
  let study: Study;
  let scenario: Scenario;
  let OSRDLanguage: string;
  const trainSchedulesJson = readJsonFile('./tests/assets/trainSchedule/train_schedules.json');
  // Constants for expected train counts
  const TOTAL_TRAINS = 21;
  const VALID_TRAINS = 17;
  const INVALID_TRAINS = 4;
  const HONORED_TRAINS = 12;
  const NOT_HONORED_TRAINS = 5;
  const VALID_AND_HONORED_TRAINS = 12;
  const INVALID_AND_NOT_HONORED_TRAINS = 0;

  test.beforeAll('Set up the scenario and post train schedules before all tests', async () => {
    ({ project, study, scenario } = await createScenario());

    // Post train schedule
    await sendTrainSchedules(scenario.timetable_id, trainSchedulesJson);
  });
  test.afterAll('Delete the created scenario', async () => {
    await deleteScenario(project.id, study.id, scenario.name);
  });
  test.beforeEach('Navigate to scenario page before each test', async ({ page }) => {
    const operationalStudiesPage = new OperationalStudiesPage(page);
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto(
      `/operational-studies/projects/${project.id}/studies/${study.id}/scenarios/${scenario.id}`
    );
    // Ensure infrastructure is loaded
    await operationalStudiesPage.checkInfraLoaded();
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
