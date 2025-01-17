import { v4 as uuidv4 } from 'uuid';

import type { Project, Study } from 'common/api/osrdEditoastApi';

import studyData from './assets/operationStudies/study.json';
import test from './logging-fixture';
import StudyPage from './pages/study-page-model';
import { formatDateToDayMonthYear, generateUniqueName } from './utils';
import { getProject } from './utils/api-setup';
import { createStudy } from './utils/setup-utils';
import { deleteStudy } from './utils/teardown-utils';
import enTranslations from '../public/locales/en/operationalStudies/study.json';
import frTranslations from '../public/locales/fr/operationalStudies/study.json';

test.describe('Validate the Study creation workflow', () => {
  let studyPage: StudyPage;
  let project: Project;
  let study: Study;

  test.beforeAll(' Retrieve a project', async () => {
    project = await getProject();
  });

  test.beforeEach(async ({ page }) => {
    studyPage = new StudyPage(page);
  });

  /** *************** Test 1 **************** */
  test('Create a new study', async ({ page }) => {
    // Navigate to project page
    await page.goto(`/operational-studies/projects/${project.id}`);
    // Set translations based on the language
    const PROJECT_LANGUAGE = process.env.PROJECT_LANGUAGE || '';
    const translations = PROJECT_LANGUAGE === 'English' ? enTranslations : frTranslations;
    const studyName = `${studyData.name} ${uuidv4()}`; // Unique study name
    const todayDateISO = new Date().toISOString().split('T')[0]; // Get today's date in ISO format
    const expectedDate = formatDateToDayMonthYear(todayDateISO, PROJECT_LANGUAGE);
    // Create a new study using the study page model
    await studyPage.createStudy({
      name: studyName,
      description: studyData.description,
      type: translations.studyCategories.flowRate, // Translated study type
      status: translations.studyStates.started, // Translated study status
      startDate: todayDateISO,
      estimatedEndDate: todayDateISO,
      endDate: todayDateISO,
      serviceCode: studyData.service_code,
      businessCode: studyData.business_code,
      budget: studyData.budget,
      tags: studyData.tags,
    });

    // Validate that the study was created with the correct data
    await studyPage.validateStudyData({
      name: studyName,
      description: studyData.description,
      type: translations.studyCategories.flowRate,
      status: translations.studyStates.started,
      startDate: expectedDate,
      estimatedEndDate: expectedDate,
      endDate: expectedDate,
      serviceCode: studyData.service_code,
      businessCode: studyData.business_code,
      budget: studyData.budget,
      tags: studyData.tags,
    });
    await deleteStudy(project.id, studyName);
  });

  /** *************** Test 2 **************** */
  test('Update an existing study', async ({ page }) => {
    const PROJECT_LANGUAGE = process.env.PROJECT_LANGUAGE || '';
    // Create a study
    study = await createStudy(project.id, generateUniqueName(studyData.name));
    // Navigate to study page
    await page.goto(`/operational-studies/projects/${project.id}/studies/${study.id}`);
    const translations = PROJECT_LANGUAGE === 'English' ? enTranslations : frTranslations;
    const tomorrowDateISO = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Get tomorrow's date in ISO format
    const expectedDate = formatDateToDayMonthYear(tomorrowDateISO, PROJECT_LANGUAGE);
    // Update the study with new values
    await studyPage.updateStudy({
      name: `${study.name} (updated)`,
      description: `${study.description} (updated)`,
      type: translations.studyCategories.operability,
      status: translations.studyStates.inProgress,
      startDate: tomorrowDateISO,
      estimatedEndDate: tomorrowDateISO,
      endDate: tomorrowDateISO,
      serviceCode: 'A1230',
      businessCode: 'B1230',
      budget: '123456789',
      tags: ['update-tag'],
    });

    // Navigate back to the project page
    await page.goto(`/operational-studies/projects/${project.id}`);

    // Reopen the updated study and validate the updated data
    await studyPage.openStudyByTestId(`${study.name} (updated)`);
    await studyPage.validateStudyData({
      name: `${study.name} (updated)`,
      description: `${study.description} (updated)`,
      type: translations.studyCategories.operability,
      status: translations.studyStates.inProgress,
      startDate: expectedDate,
      estimatedEndDate: expectedDate,
      endDate: expectedDate,
      serviceCode: 'A1230',
      businessCode: 'B1230',
      budget: '123456789',
      tags: ['update-tag'],
      isUpdate: true, // Indicate that this is an update
    });
    await deleteStudy(project.id, `${study.name} (updated)`);
  });

  /** *************** Test 3 **************** */
  test('Delete a study', async ({ page }) => {
    // Create a study
    study = await createStudy(project.id, generateUniqueName(studyData.name));

    // Navigate to the list of studies for the project
    await page.goto(`/operational-studies/projects/${project.id}`);

    // Delete the study by name using the study page model
    await studyPage.deleteStudy(study.name);
  });
});
