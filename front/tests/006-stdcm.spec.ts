import type { Infra } from 'common/api/osrdEditoastApi';

import HomePage from './pages/home-page-model';
import STDCMPage from './pages/stdcm-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra } from './utils/api-setup';

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

  test.beforeAll('Fetch infrastructure', async () => {
    infra = await getInfra();
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Retrieve OSRD language and navigate to STDCM page
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto('/stdcm');
    await page.waitForLoadState('load', { timeout: 30 * 1000 });

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
    await stdcmPage.fillConsistDetails();
    await stdcmPage.fillAndVerifyOriginDetails();
    await stdcmPage.fillAndVerifyDestinationDetails(OSRDLanguage);
    const viaDetails = [
      { viaNumber: 1, ciSearchValue: 'mid_west' },
      { viaNumber: 2, ciSearchValue: 'mid_east' },
      { viaNumber: 3, ciSearchValue: 'nS', language: OSRDLanguage },
    ];

    for (const { viaNumber, ciSearchValue, language } of viaDetails) {
      await stdcmPage.fillAndVerifyViaDetails(viaNumber, ciSearchValue, language);
    }

    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation();
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmAllStops.json');
  });

  /** *************** Test 3 **************** */
  test('Verify STDCM stops and simulation sheet', async ({ page, browserName }) => {
    // Populate STDCM page with origin, destination, and via details
    const stdcmPage = new STDCMPage(page);
    await stdcmPage.fillConsistDetails();
    await stdcmPage.fillOriginDetailsLight();
    await stdcmPage.fillDestinationDetailsLight();
    await stdcmPage.fillAndVerifyViaDetails(1, 'mid_west');
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
    await stdcmPage.clickOnAllViaButton();
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmWithAllVia.json');
    await stdcmPage.retainSimulation();
    await stdcmPage.downloadSimulation(browserName);
    // Reset and verify empty fields
    await stdcmPage.clickOnStartNewQueryButton();
    // TODO: Uncomment the check when the bug #9533 is fixed
    // await stdcmPage.verifyAllFieldsEmpty();
  });
});
