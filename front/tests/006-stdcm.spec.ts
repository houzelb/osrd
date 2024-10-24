import type {
  Scenario,
  Project,
  Infra,
  Study,
  StdcmSearchEnvironment,
} from 'common/api/osrdEditoastApi';

import STDCMPage from './pages/stdcm-page-model';
import test from './test-logger';
import { readJsonFile } from './utils';
import { postApiRequest } from './utils/api-setup';
import createScenario from './utils/scenario';
import { createInfrastructure, createProject, createStudy } from './utils/setup-utils';
import { deleteProject } from './utils/teardown-utils';
import { postSimulation, sendTrainSchedules } from './utils/trainSchedule';

test.describe('Verify train schedule elements and filters', () => {
  test.slow();
  let project: Project;
  let study: Study;
  let scenario: Scenario;
  let infra: Infra;
  const trainSchedulesJson = readJsonFile('./tests/assets/trainSchedule/train_schedules.json');

  test.beforeAll('Set up the STDCM environment ', async () => {
    infra = await createInfrastructure('STDCM_infra_test_e2e');
    project = await createProject('STDCM_project_test_e2e');
    study = await createStudy(project.id, 'STDCM_study_test_e2e');
    ({ scenario } = await createScenario(project.id, study.id, infra.id));

    // Post train schedule and initiate simulation
    const response = await sendTrainSchedules(scenario.timetable_id, trainSchedulesJson);
    await postSimulation(response, scenario.infra_id);
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

  test.afterAll('Delete the created project', async () => {
    await deleteProject('STDCM_project_test_e2e');
  });

  test.beforeEach(' Navigate to the STDCM page', async ({ page }) => {
    await page.goto('/stdcm');
    await page.waitForLoadState('networkidle', { timeout: 2 * 60 * 1000 });
  });

  /** *************** Test 1 **************** */
  test('Empty STDCM page', async ({ page }) => {
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.verifyStdcmElementsVisibility();
    await stdcmPage.verifyAllFieldsEmpty();
    await stdcmPage.addAndDeleteEmptyVia();
  });
});
