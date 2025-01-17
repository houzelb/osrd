import type { Infra, TowedRollingStock } from 'common/api/osrdEditoastApi';

import { electricRollingStockName, fastRollingStockName } from './assets/project-const';
import HomePage from './pages/home-page-model';
import STDCMPage, { type ConsistFields } from './pages/stdcm-page-model';
import test from './test-logger';
import { handleAndVerifyInput, waitForInfraStateToBeCached } from './utils';
import { getInfra, setTowedRollingStock } from './utils/api-setup';

test.use({
  launchOptions: {
    slowMo: 500, // Give the interface time to update between actions
  },
});
test.describe('Verify train schedule elements and filters', () => {
  test.slow(); // Mark test as slow due to multiple steps

  test.use({ viewport: { width: 1920, height: 1080 } });

  let infra: Infra;
  let OSRDLanguage: string;
  let createdTowedRollingStock: TowedRollingStock;
  const UPDATED_ORIGIN_ARRIVAL_DATE = '18/10/24';
  const consistDetails: ConsistFields = {
    tractionEngine: electricRollingStockName,
    tonnage: '950',
    length: '567',
    maxSpeed: '180',
    speedLimitTag: 'HLP',
  };
  const tractionEnginePrefilledValues = {
    tonnage: '900',
    length: '400',
    maxSpeed: '288',
  };
  const fastRollingStockPrefilledValues = {
    tonnage: '190',
    length: '46',
    maxSpeed: '220',
  };
  const towedRollingStockPrefilledValues = {
    tonnage: '46',
    length: '26',
    maxSpeed: '180',
  };

  test.beforeAll('Fetch infrastructure', async () => {
    infra = await getInfra();
    createdTowedRollingStock = await setTowedRollingStock();
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Retrieve OSRD language and navigate to STDCM page
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto('/stdcm');
    await page.waitForLoadState('load', { timeout: 30 * 1000 });
    await homePage.removeViteOverlay();

    // Wait for infra to be in 'CACHED' state before proceeding
    await waitForInfraStateToBeCached(infra.id);
  });

  /** *************** Test 1 **************** */
  test('Verify empty STDCM page', async ({ page }) => {
    // Verify visibility of STDCM elements and handle empty via fields
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.verifyStdcmElementsVisibility();
    await stdcmPage.verifyAllFieldsEmpty();
    await stdcmPage.addAndDeleteEmptyVia();
  });

  /** *************** Test 2 **************** */
  test('Launch STDCM simulation with all stops', async ({ page }) => {
    // Populate STDCM page with origin, destination, and via details, then verify
    const stdcmPage = new STDCMPage(page);

    await stdcmPage.fillAndVerifyConsistDetails(
      consistDetails,
      tractionEnginePrefilledValues.tonnage,
      tractionEnginePrefilledValues.length,
      tractionEnginePrefilledValues.maxSpeed
    );
    await stdcmPage.fillAndVerifyOriginDetails();
    await stdcmPage.fillAndVerifyDestinationDetails(OSRDLanguage);
    const viaDetails = [
      { viaNumber: 1, ciSearchText: 'mid_west' },
      { viaNumber: 2, ciSearchText: 'mid_east' },
      { viaNumber: 3, ciSearchText: 'nS', language: OSRDLanguage },
    ];

    for (const viaDetail of viaDetails) {
      await stdcmPage.fillAndVerifyViaDetails(viaDetail);
    }
    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation();
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmAllStops.json');
  });

  /** *************** Test 3 **************** */
  test('Verify STDCM stops and simulation sheet', async ({ page, browserName }) => {
    // Populate STDCM page with origin, destination, and via details
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.fillAndVerifyConsistDetails(
      consistDetails,
      tractionEnginePrefilledValues.tonnage,
      tractionEnginePrefilledValues.length,
      tractionEnginePrefilledValues.maxSpeed
    );
    await stdcmPage.fillOriginDetailsLight();
    await stdcmPage.fillDestinationDetailsLight();
    await stdcmPage.fillAndVerifyViaDetails({
      viaNumber: 1,
      ciSearchText: 'mid_west',
    });
    // Verify input map markers in Chromium
    if (browserName === 'chromium') {
      await stdcmPage.mapMarkerVisibility();
    }
    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation();
    // Verify map results markers in Chromium
    if (browserName === 'chromium') {
      await stdcmPage.mapMarkerResultVisibility();
    }
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmWithoutAllVia.json');
    await stdcmPage.displayAllOperationalPoints();
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmWithAllVia.json');
    await stdcmPage.retainSimulation();
    await stdcmPage.downloadSimulation(browserName);
    // Reset and verify empty fields
    await stdcmPage.startNewQuery();
    // TODO: Uncomment the check when the bug #9533 is fixed
    // await stdcmPage.verifyAllFieldsEmpty();
  });

  /** *************** Test 4 **************** */
  test('Launch simulation with and without capacity for towed rolling stock', async ({ page }) => {
    const towedConsistDetails: ConsistFields = {
      tractionEngine: fastRollingStockName,
      towedRollingStock: createdTowedRollingStock.name,
    };
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.fillAndVerifyConsistDetails(
      towedConsistDetails,
      fastRollingStockPrefilledValues.tonnage,
      fastRollingStockPrefilledValues.length,
      fastRollingStockPrefilledValues.maxSpeed,
      towedRollingStockPrefilledValues.tonnage,
      towedRollingStockPrefilledValues.length,
      towedRollingStockPrefilledValues.maxSpeed
    );
    await stdcmPage.fillOriginDetailsLight();
    await stdcmPage.fillDestinationDetailsLight();
    await stdcmPage.fillAndVerifyViaDetails({
      viaNumber: 1,
      ciSearchText: 'mid_west',
    });
    // Run first simulation without capacity
    await stdcmPage.launchSimulation();
    await stdcmPage.verifySimulationDetails({
      language: OSRDLanguage,
      simulationNumber: 1,
    });
    // Update tonnage and launch a second simulation with capacity
    await handleAndVerifyInput(stdcmPage.dateOriginArrival, UPDATED_ORIGIN_ARRIVAL_DATE);
    await stdcmPage.launchSimulation();
    await stdcmPage.verifySimulationDetails({
      language: OSRDLanguage,
      simulationNumber: 2,
      simulationLengthAndDuration: '51 km — 2h 35min',
    });
    await stdcmPage.verifyTableData(
      './tests/assets/stdcm/towedRollingStock/towedRollingStockTableResult.json'
    );
  });
});
