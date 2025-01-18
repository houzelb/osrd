import type { Infra, TowedRollingStock } from 'common/api/osrdEditoastApi';

import { fastRollingStockName } from './assets/project-const';
import HomePage from './pages/home-page-model';
import STDCMLinkedTrainPage from './pages/stdcm-linked-train-page-model';
import STDCMPage, { type ConsistFields } from './pages/stdcm-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra, setTowedRollingStock } from './utils/api-setup';

test.use({
  launchOptions: {
    slowMo: 500, // Give the interface time to update between actions
  },
});
test.describe('Verify stdcm simulation page', () => {
  test.slow(); // Mark test as slow due to multiple steps

  test.use({ viewport: { width: 1920, height: 1080 } });

  let infra: Infra;
  let createdTowedRollingStock: TowedRollingStock;

  const fastRollingStockPrefilledValues = {
    tonnage: '190',
    length: '45',
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
    // Navigate to STDCM page
    const homePage = new HomePage(page);
    await page.goto('/stdcm');
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await homePage.removeViteOverlay();

    // Wait for infra to be in 'CACHED' state before proceeding
    await waitForInfraStateToBeCached(infra.id);
  });
  /** *************** Test 1 **************** */
  test('Verify STDCM anterior linked train', async ({ page, browserName }) => {
    const towedConsistDetails: ConsistFields = {
      tractionEngine: fastRollingStockName,
      towedRollingStock: createdTowedRollingStock.name,
    };
    const [stdcmPage, stdcmLinkedTrainPage] = [new STDCMPage(page), new STDCMLinkedTrainPage(page)];
    await stdcmPage.fillAndVerifyConsistDetails(
      towedConsistDetails,
      fastRollingStockPrefilledValues.tonnage,
      fastRollingStockPrefilledValues.length,
      fastRollingStockPrefilledValues.maxSpeed,
      towedRollingStockPrefilledValues.tonnage,
      towedRollingStockPrefilledValues.length,
      towedRollingStockPrefilledValues.maxSpeed
    );
    await stdcmLinkedTrainPage.anteriorLinkedPathDetails();
    await stdcmPage.fillAndVerifyViaDetails({
      viaNumber: 1,
      ciSearchText: 'nS',
    });
    await stdcmPage.fillDestinationDetailsLight();
    await stdcmPage.launchSimulation();
    await stdcmPage.retainSimulation();
    await stdcmPage.downloadSimulation(browserName, true);
  });

  /** *************** Test 2 **************** */
  test('Verify STDCM posterior linked train', async ({ page, browserName }) => {
    const towedConsistDetails: ConsistFields = {
      tractionEngine: fastRollingStockName,
      towedRollingStock: createdTowedRollingStock.name,
    };
    const [stdcmPage, stdcmLinkedTrainPage] = [new STDCMPage(page), new STDCMLinkedTrainPage(page)];
    await stdcmPage.fillAndVerifyConsistDetails(
      towedConsistDetails,
      fastRollingStockPrefilledValues.tonnage,
      fastRollingStockPrefilledValues.length,
      fastRollingStockPrefilledValues.maxSpeed,
      towedRollingStockPrefilledValues.tonnage,
      towedRollingStockPrefilledValues.length,
      towedRollingStockPrefilledValues.maxSpeed
    );
    await stdcmLinkedTrainPage.posteriorLinkedPathDetails();
    await stdcmPage.fillAndVerifyViaDetails({
      viaNumber: 1,
      ciSearchText: 'mid_east',
    });
    await stdcmPage.fillOriginDetailsLight('respectDestinationSchedule', true);
    await stdcmPage.launchSimulation();
    await stdcmPage.retainSimulation();
    await stdcmPage.downloadSimulation(browserName, true);
  });
});
