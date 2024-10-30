import type {
  Scenario,
  Project,
  Infra,
  Study,
  StdcmSearchEnvironment,
} from 'common/api/osrdEditoastApi';

import HomePage from './pages/home-page-model';
import STDCMPage from './pages/stdcm-page-model';
import test from './test-logger';
import { readJsonFile } from './utils';
import { postApiRequest } from './utils/api-setup';
import createScenario from './utils/scenario';
import { createInfrastructure, createProject, createStudy } from './utils/setup-utils';
import { deleteProject } from './utils/teardown-utils';
import { sendTrainSchedules } from './utils/trainSchedule';

test.describe('Verify train schedule elements and filters', () => {
  test.slow(); // Mark test as slow due to multiple steps
  let project: Project;
  let study: Study;
  let scenario: Scenario;
  let infra: Infra;
  let OSRDLanguage: string;
  const trainSchedulesJson = readJsonFile('./tests/assets/trainSchedule/train_schedules.json');

  test.beforeAll('Set up the STDCM environment ', async () => {
    // Set timeout for initial setup
    test.setTimeout(180000); // 3 minutes

    // Set up infrastructure, project, study, and scenario for tests
    infra = await createInfrastructure('STDCM_infra_test_e2e');
    project = await createProject('STDCM_project_test_e2e');
    study = await createStudy(project.id, 'STDCM_study_test_e2e');
    scenario = (await createScenario(project.id, study.id, infra.id)).scenario;

    // Post train schedules
    await sendTrainSchedules(scenario.timetable_id, trainSchedulesJson);

    // Configure STDCM search environment for the tests
    await postApiRequest(
      '/api/stdcm/search_environment',
      {
        infra_id: infra.id,
        search_window_begin: '2024-10-17T00:00:01',
        search_window_end: '2024-10-18T23:59:59',
        timetable_id: scenario.timetable_id,
      } as StdcmSearchEnvironment,
      undefined,
      'Failed to update STDCM configuration environment'
    );
  });

  test.afterAll('Clean up by deleting the created project', async () => {
    await deleteProject(project.name);
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Retrieve OSRD language and navigate to STDCM page
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto('/stdcm');
    await page.waitForLoadState('networkidle', { timeout: 120000 }); // 2 minutes
  });

  /** *************** Test 1 **************** */
  test('Empty STDCM page', async ({ page }) => {
    // Verify visibility of STDCM elements and handle empty via fields
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.verifyStdcmElementsVisibility();
    await stdcmPage.verifyAllFieldsEmpty();
    await stdcmPage.addAndDeleteEmptyVia();
  });

  /** *************** Test 2 **************** */
  test('STDCM simulation with all stops', async ({ page }) => {
    // Populate STDCM page with origin, destination, and via details, then verify
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.fillConsistDetails();
    await stdcmPage.fillAndVerifyOriginDetails();
    await stdcmPage.fillAndVerifyDestinationDetails(OSRDLanguage);
    await stdcmPage.fillAndVerifyViaDetails(1, 'mid_west');
    await stdcmPage.fillAndVerifyViaDetails(2, 'mid_east');
    await stdcmPage.fillAndVerifyViaDetails(3, 'nS', OSRDLanguage);

    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation(OSRDLanguage);
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmAllStops.json');
  });

  /** *************** Test 3 **************** */
  test('STDCM stops and simulation sheet', async ({ page }) => {
    // Populate STDCM page with origin, destination, and via details
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.fillConsistDetails();
    await stdcmPage.fillOriginDetailsLight();
    await stdcmPage.fillDestinationDetailsLight();
    await stdcmPage.fillAndVerifyViaDetails(1, 'mid_west');

    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation(OSRDLanguage);
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmWithoutAllVia.json');
    await stdcmPage.clickOnAllViaButton();
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmWithAllVia.json');
    await stdcmPage.retainSimulation();
  });
});
