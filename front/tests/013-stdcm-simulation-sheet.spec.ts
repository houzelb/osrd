import fs from 'fs';

import pdfParse from 'pdf-parse';

import type { Infra } from 'common/api/osrdEditoastApi';

import { electricRollingStockName } from './assets/project-const';
import simulationSheetDetails from './assets/simulation-sheet-const';
import HomePage from './pages/home-page-model';
import STDCMPage, { type ConsistFields } from './pages/stdcm-page-model';
import test from './test-logger';
import { waitForInfraStateToBeCached } from './utils';
import { getInfra } from './utils/api-setup';
import { findFirstPdf, verifySimulationContent } from './utils/simulationSheet';
import type { Simulation } from './utils/types';

test.use({
  launchOptions: {
    slowMo: 500, // Give the interface time to update between actions
  },
});
test.describe('Verify stdcm simulation page', () => {
  test.describe.configure({ mode: 'serial' }); // Configure this block to run serially
  test.slow(); // Mark test as slow due to multiple steps
  test.use({ viewport: { width: 1920, height: 1080 } });

  let infra: Infra;
  let OSRDLanguage: string;
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

  test.beforeAll('Fetch infrastructure', async () => {
    infra = await getInfra();
  });

  test.beforeEach('Navigate to the STDCM page', async ({ page }) => {
    // Retrieve OSRD language and navigate to STDCM page
    const homePage = new HomePage(page);
    await homePage.goToHomePage();
    OSRDLanguage = await homePage.getOSRDLanguage();
    await page.goto('/stdcm');
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await homePage.removeViteOverlay();

    // Wait for infra to be in 'CACHED' state before proceeding
    await waitForInfraStateToBeCached(infra.id);
  });

  /** *************** Test 1 **************** */
  test('Verify STDCM stops and simulation sheet', async ({ page, browserName, context }) => {
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
    const [newPage] = await Promise.all([context.waitForEvent('page'), stdcmPage.startNewQuery()]);
    await newPage.waitForLoadState();
    // TODO: Uncomment the check when the bug #10335 is fixed
    // const newStdcmPage = new STDCMPage(newPage);
    // await newStdcmPage.verifyAllFieldsEmpty();
  });

  /** *************** Test 2 **************** */
  test('Verify simulation sheet content', async ({ browserName }) => {
    const downloadDir = `./tests/stdcm-results/${browserName}`;
    const pdfFilePath = findFirstPdf(downloadDir);

    if (!pdfFilePath) {
      throw new Error(`No PDF files found in directory: ${downloadDir}`);
    }
    // Read and parse the PDF
    const pdfBuffer = fs.readFileSync(pdfFilePath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    const expectedSimulation: Simulation = simulationSheetDetails(OSRDLanguage);
    verifySimulationContent(pdfText, expectedSimulation);
  });
});
