import type { Infra } from 'common/api/osrdEditoastApi';

import { infrastructureName } from './assets/project-const';
import STDCMPage from './pages/stdcm-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra } from './utils/api-setup';

test.describe('Verify train schedule elements and filters', () => {
  test.slow(); // Mark test as slow due to multiple steps

  let infra: Infra;

  test.beforeAll('Fetch infrastructure', async () => {
    infra = await getInfra(infrastructureName);
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Navigate to STDCM page
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
});
