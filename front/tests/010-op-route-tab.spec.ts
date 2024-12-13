import type { Infra, Project, Scenario, Study } from 'common/api/osrdEditoastApi';

import { electricRollingStockName } from './assets/project-const';
import HomePage from './pages/home-page-model';
import RoutePage from './pages/op-route-page-model';
import OperationalStudiesPage from './pages/operational-studies-page-model';
import RollingStockSelectorPage from './pages/rollingstock-selector-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra } from './utils/api-setup';
import createScenario from './utils/scenario';
import { deleteScenario } from './utils/teardown-utils';

test.describe('Route Tab Verification', () => {
  test.slow();
  let project: Project;
  let study: Study;
  let scenario: Scenario;
  let OSRDLanguage: string;
  let infra: Infra;

  test.beforeAll('Set up the scenario', async () => {
    ({ project, study, scenario } = await createScenario());
    infra = await getInfra();
  });

  test.afterAll('Delete the created scenario', async () => {
    await deleteScenario(project.id, study.id, scenario.name);
  });

  test.beforeEach(
    'Navigate to the scenario page and select the rolling stock before each test',
    async ({ page }) => {
      const [operationalStudiesPage, rollingstockSelectorPage, homePage] = [
        new OperationalStudiesPage(page),
        new RollingStockSelectorPage(page),
        new HomePage(page),
      ];

      await homePage.goToHomePage();
      OSRDLanguage = await homePage.getOSRDLanguage();

      await page.goto(
        `/operational-studies/projects/${project.id}/studies/${study.id}/scenarios/${scenario.id}`
      );

      // Wait for infra to be in 'CACHED' state before proceeding
      await waitForInfraStateToBeCached(infra.id);

      // Click on add train button and verify tab warnings
      await operationalStudiesPage.clickOnAddTrainButton();
      await operationalStudiesPage.verifyTabWarningPresence();

      // Select electric rolling stock and navigate to the Route Tab
      await rollingstockSelectorPage.selectRollingStock(electricRollingStockName);
      await operationalStudiesPage.clickOnRouteTab();
    }
  );

  /** *************** Test 1 **************** */
  test('Select a route for operational study', async ({ page }) => {
    const operationalStudiesPage = new OperationalStudiesPage(page);
    const routePage = new RoutePage(page);

    // Verify that no route is initially selected
    await routePage.verifyNoSelectedRoute(OSRDLanguage);

    // Perform pathfinding by station trigrams and verify map markers in Chromium
    await routePage.performPathfindingByTrigram('WS', 'NES', 'MES');
    // TODO: Uncomment this part when osm server is up again
    // if (browserName === 'chromium') {
    //   const expectedMapMarkersValues = ['West_station', 'North_East_station', 'Mid_East_station'];
    //   await routePage.verifyMapMarkers(...expectedMapMarkersValues);
    // }

    // Verify that tab warnings are absent
    await operationalStudiesPage.verifyTabWarningAbsence();
  });

  /** *************** Test 2 **************** */
  test('Adding waypoints to a route for operational study', async ({ page }) => {
    const operationalStudiesPage = new OperationalStudiesPage(page);
    const routePage = new RoutePage(page);

    // Perform pathfinding by station trigrams
    await routePage.performPathfindingByTrigram('WS', 'NES');

    // Define waypoints and add them to the route
    const expectedViaValues = [
      { name: 'Mid_West_station', ch: 'BV', uic: '3', km: 'KM 12.050' },
      { name: 'Mid_East_station', ch: 'BV', uic: '4', km: 'KM 26.500' },
    ];
    await routePage.addNewWaypoints(2, ['Mid_West_station', 'Mid_East_station'], expectedViaValues);

    // Verify map markers in Chromium
    // TODO: Uncomment this part when osm server is up again
    // if (browserName === 'chromium') {
    //   const expectedMapMarkersValues = [
    //     'West_station',
    //     'Mid_West_station',
    //     'Mid_East_station',
    //     'North_East_station',
    //   ];
    //   await routePage.verifyMapMarkers(...expectedMapMarkersValues);
    // }

    // Verify that tab warnings are absent
    await operationalStudiesPage.verifyTabWarningAbsence();
  });

  /** *************** Test 3 **************** */
  test('Reversing and deleting waypoints in a route for operational study', async ({ page }) => {
    const routePage = new RoutePage(page);

    // Perform pathfinding by station trigrams and verify map markers in Chromium
    await routePage.performPathfindingByTrigram('WS', 'SES', 'MWS');
    // TODO: Uncomment this part when osm server is up again
    // const expectedMapMarkersValues = ['West_station', 'South_East_station', 'Mid_West_station'];
    // if (browserName === 'chromium') {
    //   await routePage.verifyMapMarkers(...expectedMapMarkersValues);
    // }

    // Reverse the itinerary and verify the map markers
    await routePage.clickOnReverseItinerary();
    // TODO: Uncomment this part when osm server is up again
    // if (browserName === 'chromium') {
    //   const reversedMapMarkersValues = [...expectedMapMarkersValues].reverse();
    //   await routePage.verifyMapMarkers(...reversedMapMarkersValues);
    // }

    // Delete operational points and verify no selected route
    await routePage.clickOnDeleteOPButtons(OSRDLanguage);
    await routePage.verifyNoSelectedRoute(OSRDLanguage);

    // Perform pathfinding again and verify map markers in Chromium
    await routePage.performPathfindingByTrigram('WS', 'SES', 'MWS');
    // TODO: Uncomment this part when osm server is up again
    // if (browserName === 'chromium') {
    //   await routePage.verifyMapMarkers(...expectedMapMarkersValues);
    // }

    // Delete the itinerary and verify no selected route
    await routePage.clickDeleteItineraryButton();
    await routePage.verifyNoSelectedRoute(OSRDLanguage);
  });
});
