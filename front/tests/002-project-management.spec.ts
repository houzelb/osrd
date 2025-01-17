import type { Project } from 'common/api/osrdEditoastApi';

import projectData from './assets/operationStudies/project.json';
import test from './logging-fixture';
import ProjectPage from './pages/project-page-model';
import { generateUniqueName } from './utils';
import { createProject } from './utils/setup-utils';
import { deleteProject } from './utils/teardown-utils';

test.describe('Validate the Operational Study Project workflow', () => {
  let project: Project;
  let projectPage: ProjectPage;

  test.beforeEach('Navigate to the projects page', async ({ page }) => {
    projectPage = new ProjectPage(page);
    // Create a project
    project = await createProject(generateUniqueName(projectData.name));
    await page.goto('/operational-studies/projects');
  });

  /** *************** Test 1 **************** */
  test('Create a new project', async () => {
    // Define a unique project name for the test
    const projectName = generateUniqueName(projectData.name);

    // Create a new project using the project page model and json data
    await projectPage.createProject({
      name: projectName,
      description: projectData.description,
      objectives: projectData.objectives,
      funders: projectData.funders,
      budget: projectData.budget,
      tags: projectData.tags,
    });

    // Validate that the project was created with the correct data
    await projectPage.validateProjectData({
      name: projectName,
      description: projectData.description,
      objectives: projectData.objectives,
      funders: projectData.funders,
      budget: projectData.budget,
      tags: projectData.tags,
    });

    // Delete the created project
    await deleteProject(projectName);
  });

  /** *************** Test 2 **************** */
  test('Update an existing project', async () => {
    // Open the created project by name using the project page model
    await projectPage.openProjectByTestId(project.name);

    // Update the project data and save it
    await projectPage.updateProject({
      name: `${project.name} (updated)`,
      description: `${project.description} (updated)`,
      objectives: `${projectData.objectives} (updated)`,
      funders: `${project.funders} (updated)`,
      budget: '123456789',
      tags: ['update-tag'],
    });

    // Navigate back to the Operational Studies page via the home page
    await projectPage.goToHomePage();
    await projectPage.goToOperationalStudiesPage();

    // Reopen the updated project and validate the updated data
    await projectPage.openProjectByTestId(`${project.name} (updated)`);
    await projectPage.validateProjectData({
      name: `${project.name} (updated)`,
      description: `${project.description} (updated)`,
      objectives: `${projectData.objectives} (updated)`,
      funders: `${project.funders} (updated)`,
      budget: '123456789',
      tags: ['update-tag'],
    });
    // Delete the created project
    await deleteProject(`${project.name} (updated)`);
  });

  /** *************** Test 3 **************** */
  test('Delete a project', async () => {
    // Find the project by name and delete it using the page model
    await projectPage.openProjectByTestId(project.name);
    await projectPage.deleteProject(project.name);
  });
});
