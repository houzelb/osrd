import type { Infra } from 'common/api/osrdEditoastApi';

import { infrastructureName } from './assets/project-const';
import HomePage from './pages/home-page-model';
import STDCMPage from './pages/stdcm-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra } from './utils/api-setup';

test.describe('Verify train schedule elements and filters', () => {
  test.slow(); // Mark test as slow due to multiple steps

  let infra: Infra;
  let OSRDLanguage: string;

  test.beforeAll('Fetch infrastructure', async () => {
    infra = await getInfra(infrastructureName);
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Retrieve OSRD language and navigate to STDCM page
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto('/stdcm');
    // Wait for infra to be in 'CACHED' state before proceeding
    await waitForInfraStateToBeCached(infra.id);
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
    const viaDetails = [
      { viaNumber: 1, ciSearchValue: 'mid_west' },
      { viaNumber: 2, ciSearchValue: 'mid_east' },
      { viaNumber: 3, ciSearchValue: 'nS', language: OSRDLanguage },
    ];

    for (const { viaNumber, ciSearchValue, language } of viaDetails) {
      await stdcmPage.fillAndVerifyViaDetails(viaNumber, ciSearchValue, language);
    }

    // Launch simulation and verify output data matches expected results
    await stdcmPage.launchSimulation(OSRDLanguage);
    await stdcmPage.verifyTableData('./tests/assets/stdcm/stdcmAllStops.json');
  });
});
