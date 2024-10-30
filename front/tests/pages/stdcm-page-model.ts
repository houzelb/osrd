import { expect, type Locator, type Page } from '@playwright/test';

import enTranslations from '../../public/locales/en/stdcm.json';
import frTranslations from '../../public/locales/fr/stdcm.json';
import { readJsonFile } from '../utils';

interface TableRow {
  index: number;
  operationalPoint: string;
  code: string;
  endStop: string | null;
  passageStop: string | null;
  startStop: string | null;
  weight: string | null;
  refEngine: string | null;
}

class STDCMPage {
  readonly page: Page;

  readonly debugButton: Locator;

  readonly notificationHeader: Locator;

  readonly consistCard: Locator;

  readonly originCard: Locator;

  readonly destinationCard: Locator;

  readonly mapContainer: Locator;

  readonly tractionEngineField: Locator;

  readonly tonnageField: Locator;

  readonly lengthField: Locator;

  readonly codeCompoField: Locator;

  readonly maxSpeedField: Locator;

  readonly addViaButton: Locator;

  readonly viaIcon: Locator;

  readonly viaDeleteButton: Locator;

  readonly originArrival: Locator;

  readonly dateOriginArrival: Locator;

  readonly timeOriginArrival: Locator;

  readonly toleranceOriginArrival: Locator;

  readonly destinationArrival: Locator;

  readonly dateDestinationArrival: Locator;

  readonly timeDestinationArrival: Locator;

  readonly toleranceDestinationArrival: Locator;

  readonly warningBox: Locator;

  readonly suggestionList: Locator;

  readonly suggestionNS: Locator;

  readonly suggestionNWS: Locator;

  readonly suggestionSS: Locator;

  readonly suggestionMES: Locator;

  readonly suggestionMWS: Locator;

  readonly dynamicOriginCh: Locator;

  readonly dynamicDestinationCh: Locator;

  readonly dynamicOriginCi: Locator;

  readonly dynamicDestinationCi: Locator;

  readonly suggestionItems: Locator;

  readonly simulationStatus: Locator;

  readonly simulationList: Locator;

  readonly launchSimulationButton: Locator;

  readonly cancelSimulationButton: Locator;

  readonly simulationLoader: Locator;

  readonly incrementButton: Locator;

  readonly allViaButton: Locator;

  readonly retainSimulationButton: Locator;

  readonly downloadSimulationButton: Locator;

  readonly startNewQueryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.notificationHeader = page.locator('#notification');
    this.debugButton = page.getByTestId('stdcm-debug-button');
    this.mapContainer = page.locator('#map-container');
    this.consistCard = page.locator('.stdcm-consist-container .stdcm-card');
    this.originCard = page.locator('.stdcm-card:has(.stdcm-origin-icon)');
    this.destinationCard = page.locator('.stdcm-card:has(.stdcm-destination-icon)');
    this.tractionEngineField = page.locator('#tractionEngine');
    this.tonnageField = page.locator('#tonnage');
    this.lengthField = page.locator('#length');
    this.codeCompoField = page.locator('#speed-limit-by-tag-selector');
    this.maxSpeedField = page.locator('#maxSpeed');
    this.addViaButton = page.locator('.stdcm-card.has-tip .stdcm-card__body.add-via button');
    this.viaIcon = page.locator('.stdcm-via-icons');
    this.viaDeleteButton = page.getByTestId('delete-via-button');
    this.originArrival = page.locator('#select-origin-arrival');
    this.dateOriginArrival = page.locator('#date-origin-arrival');
    this.timeOriginArrival = page.locator('#time-origin-arrival');
    this.toleranceOriginArrival = page.locator('#stdcm-tolerance-origin-arrival');
    this.destinationArrival = page.locator('#select-destination-arrival');
    this.dateDestinationArrival = page.locator('#date-destination-arrival');
    this.timeDestinationArrival = page.locator('#time-destination-arrival');
    this.toleranceDestinationArrival = page.locator('#stdcm-tolerance-destination-arrival');
    this.warningBox = page.getByTestId('warning-box');
    this.suggestionList = page.locator('.suggestions-list');
    this.suggestionItems = this.suggestionList.locator('.suggestion-item');
    this.suggestionNS = this.suggestionList.locator('.suggestion-item', {
      hasText: 'NS North_station',
    });
    this.suggestionNWS = this.suggestionList.locator('.suggestion-item', {
      hasText: 'NWS North_West_station',
    });

    this.suggestionSS = this.suggestionList.locator('.suggestion-item', {
      hasText: 'SS South_station',
    });

    this.suggestionMES = this.suggestionList.locator('.suggestion-item', {
      hasText: 'MES Mid_East_station',
    });
    this.suggestionMWS = this.suggestionList.locator('.suggestion-item', {
      hasText: 'MWS Mid_West_station',
    });

    this.dynamicOriginCh = this.originCard.locator('[id^="id"][id$="-ch"]');
    this.dynamicDestinationCh = this.destinationCard.locator('[id^="id"][id$="-ch"]');
    this.dynamicOriginCi = this.originCard.locator('[id^="id"][id$="-ci"]');
    this.dynamicDestinationCi = this.destinationCard.locator('[id^="id"][id$="-ci"]');
    this.simulationStatus = page.getByTestId('simulation-status');
    this.simulationList = page.locator('.simulation-list .simulation-name');
    this.launchSimulationButton = page.getByTestId('launch-simulation-button');
    this.cancelSimulationButton = page.getByTestId('cancel-simulation-button');
    this.simulationLoader = page.locator('.stdcm-loader');
    this.incrementButton = page.locator('.minute-button', { hasText: '+1mn' });
    this.allViaButton = page.getByTestId('all-via-button');
    this.retainSimulationButton = page.getByTestId('retain-simulation-button');
    this.downloadSimulationButton = page.getByTestId('download-simulation-button');
    this.startNewQueryButton = page.getByTestId('start-new-query-button');
  }

  // Dynamic selectors for via cards
  private getViaCard(viaNumber: number): Locator {
    return this.page.locator(`.stdcm-card:has(.stdcm-via-icons:has-text("${viaNumber}"))`);
  }

  private getViaCh(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('[id^="id"][id$="-ch"]');
  }

  private getViaCi(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('[id^="id"][id$="-ci"]');
  }

  private getViaType(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('#type');
  }

  private getViaStopTime(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('#stdcm-via-stop-time');
  }

  private getViaWarning(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('.status-message-wrapper');
  }

  private async setMinuteLocator(minuteValue: string) {
    const minuteLocator = this.page.locator('.time-grid .minute', { hasText: minuteValue });
    await minuteLocator.click();
  }

  private async setHourLocator(hourValue: string) {
    const hourLocator = this.page.locator('.time-grid .hour', { hasText: hourValue });
    await hourLocator.click();
  }

  async verifyStdcmElementsVisibility() {
    await expect(this.debugButton).toBeVisible();
    await expect(this.notificationHeader).toBeVisible();
    await expect(this.consistCard).toBeVisible();
    await expect(this.originCard).toBeVisible();
    await expect(this.addViaButton).toBeVisible();
    await expect(this.destinationCard).toBeVisible();
    await expect(this.mapContainer).toBeVisible();
    await expect(this.launchSimulationButton).toBeVisible();
  }

  // Verifies all input fields are empty
  async verifyAllFieldsEmpty() {
    const emptyFields = [
      this.tractionEngineField,
      this.tonnageField,
      this.lengthField,
      this.maxSpeedField,
      this.dynamicOriginCi,
      this.dynamicDestinationCi,
      this.dynamicOriginCh,
      this.dynamicDestinationCh,
    ];
    for (const field of emptyFields) await expect(field).toHaveValue('');
    await expect(this.codeCompoField).toHaveValue('__PLACEHOLDER__');
  }

  // Adds a via card, verifies fields, and deletes it
  async addAndDeleteEmptyVia() {
    await this.addViaButton.click();
    await expect(this.getViaCi(1)).toHaveValue('');
    await expect(this.getViaCh(1)).toHaveValue('');
    await this.viaIcon.hover();
    await expect(this.viaDeleteButton).toBeVisible();
    await this.viaDeleteButton.click();
    await expect(this.getViaCi(1)).not.toBeVisible();
    await expect(this.getViaCh(1)).not.toBeVisible();
  }

  // Verifies the origin suggestions when search for north
  async verifyOriginNorthSuggestions() {
    await expect(this.suggestionList).toBeVisible();
    expect(await this.suggestionItems.count()).toEqual(3);
    await expect(this.suggestionItems.nth(0)).toHaveText('NES North_East_station');
    await expect(this.suggestionItems.nth(1)).toHaveText('NS North_station');
    await expect(this.suggestionItems.nth(2)).toHaveText('NWS North_West_station');
  }

  // Verifies the destination suggestions when search for south
  async verifyDestinationSouthSuggestions() {
    await expect(this.suggestionList).toBeVisible();
    expect(await this.suggestionItems.count()).toEqual(3);
    await expect(this.suggestionItems.nth(0)).toHaveText('SES South_East_station');
    await expect(this.suggestionItems.nth(1)).toHaveText('SS South_station');
    await expect(this.suggestionItems.nth(2)).toHaveText('SWS South_West_station');
  }

  // Fills fields with test values in the consist section
  async fillConsistDetails() {
    await this.tractionEngineField.fill('electric_rolling_stock_test_e2e');
    await this.tonnageField.fill('400');
    await this.lengthField.fill('300');
    await this.codeCompoField.selectOption('HLP');
    await this.maxSpeedField.fill('180');
  }

  // Fills and verifies origin details with suggestions
  async fillAndVerifyOriginDetails() {
    await this.dynamicOriginCi.fill('North');
    await this.verifyOriginNorthSuggestions();
    await this.suggestionNWS.click();
    await expect(this.dynamicOriginCi).toHaveValue('North_West_station');
    await expect(this.dynamicOriginCh).toHaveValue('BV');
    await expect(this.originArrival).toHaveValue('preciseTime');
    await expect(this.dateOriginArrival).toHaveValue('17/10/24');
    await expect(this.timeOriginArrival).toHaveValue('');
    await expect(this.toleranceOriginArrival).toHaveValue('-30/+30');
    await this.dynamicOriginCh.selectOption('BC');
    await this.originArrival.selectOption('asSoonAsPossible');
    await expect(this.dateOriginArrival).not.toBeVisible();
    await expect(this.timeOriginArrival).not.toBeVisible();
    await expect(this.toleranceOriginArrival).not.toBeVisible();
  }

  // Fill origin section
  async fillOriginDetailsLight() {
    await this.dynamicOriginCi.fill('North');
    await this.suggestionNWS.click();
    await expect(this.dynamicOriginCh).toHaveValue('BV');
    await expect(this.originArrival).toHaveValue('preciseTime');
    await this.dateOriginArrival.fill('17/10/24');
    await this.timeOriginArrival.fill('20:11');
    await this.fillToleranceField('-1h00', '+15', true);
  }

  // Fill origin section
  async fillDestinationDetailsLight() {
    await this.dynamicDestinationCi.fill('South');
    await this.suggestionSS.click();
    await expect(this.dynamicDestinationCh).toHaveValue('BV');
    await expect(this.destinationArrival).toHaveValue('asSoonAsPossible');
  }

  // Fills and verifies destination details based on selected language
  async fillAndVerifyDestinationDetails(selectedLanguage: string) {
    const translations = selectedLanguage === 'English' ? enTranslations : frTranslations;
    await this.dynamicDestinationCi.fill('South');
    await this.verifyDestinationSouthSuggestions();
    await this.suggestionSS.click();
    await expect(this.dynamicDestinationCi).toHaveValue('South_station');
    await expect(this.dynamicDestinationCh).toHaveValue('BV');
    await expect(this.destinationArrival).toHaveValue('asSoonAsPossible');
    await expect(this.warningBox).toContainText(translations.stdcmErrors.noScheduledPoint);
    await expect(this.dateDestinationArrival).not.toBeVisible();
    await expect(this.timeDestinationArrival).not.toBeVisible();
    await expect(this.toleranceDestinationArrival).not.toBeVisible();
    await this.destinationArrival.selectOption('preciseTime');
    await expect(this.dateDestinationArrival).toHaveValue('17/10/24');
    await expect(this.timeDestinationArrival).toHaveValue('');
    await expect(this.toleranceDestinationArrival).toHaveValue('-30/+30');
    await this.dateDestinationArrival.fill('18/10/24');
    await this.timeDestinationArrival.click();
    await this.setHourLocator('01'); // Select hour 01
    await this.setMinuteLocator('35'); // Select minute 35
    await this.incrementButton.dblclick(); // Double-click the +1 minute button to reach 37
    await this.timeDestinationArrival.click();
    await this.fillToleranceField('-1h15', '+45', false);
    await expect(this.warningBox).not.toBeVisible();
  }

  async fillToleranceField(minusValue: string, plusValue: string, isOrigin: boolean) {
    const toleranceField = isOrigin
      ? this.toleranceOriginArrival
      : this.toleranceDestinationArrival;

    await toleranceField.click();
    await this.page.getByRole('button', { name: minusValue, exact: true }).click();
    await this.page.getByRole('button', { name: plusValue, exact: true }).click();
    await toleranceField.click();
  }

  async fillAndVerifyViaDetails(viaNumber: number, viaSearch: string, selectedLanguage?: string) {
    const translations = selectedLanguage === 'English' ? enTranslations : frTranslations;

    // Fill 'mid_west' via details
    if (viaSearch === 'mid_west') {
      await this.addViaButton.nth(viaNumber - 1).click();
      await this.getViaCi(viaNumber).fill(viaSearch);
      await this.suggestionMWS.click();
      await expect(this.getViaCh(viaNumber)).toHaveValue('BV');
      await expect(this.getViaType(viaNumber)).toHaveValue('passageTime');
    }

    // Fill 'mid_east' via details and adjust stop time
    if (viaSearch === 'mid_east') {
      await this.addViaButton.nth(viaNumber - 1).click();
      await this.getViaCi(viaNumber).fill(viaSearch);
      await this.suggestionMES.click();
      await expect(this.getViaCh(viaNumber)).toHaveValue('BV');
      await expect(this.getViaType(viaNumber)).toHaveValue('passageTime');
      await this.getViaType(viaNumber).selectOption('serviceStop');
      await expect(this.getViaStopTime(viaNumber)).toHaveValue('0');
      await this.getViaStopTime(viaNumber).fill('3');
    }

    // Fill 'sS' via details, adjust stop time, and verify warning
    if (viaSearch === 'nS' && selectedLanguage) {
      await this.addViaButton.nth(viaNumber - 1).click();
      await this.getViaCi(viaNumber).fill(viaSearch);
      await this.suggestionNS.click();
      await expect(this.getViaCh(viaNumber)).toHaveValue('BV');
      await expect(this.getViaType(viaNumber)).toHaveValue('passageTime');
      await this.getViaType(viaNumber).selectOption('driverSwitch');
      await expect(this.getViaStopTime(viaNumber)).toHaveValue('3');
      await this.getViaStopTime(viaNumber).fill('2');
      await expect(this.getViaWarning(viaNumber)).toBeVisible();
      expect(await this.getViaWarning(viaNumber).textContent()).toEqual(
        translations.trainPath.warningMinStopTime
      );
      await this.getViaStopTime(viaNumber).fill('4');
      await expect(this.getViaWarning(viaNumber)).not.toBeVisible();
    }
  }

  async clickOnAllViaButton() {
    await this.allViaButton.click();
  }

  // Launches the simulation, verifies the loading indicator, and checks if simulation-related elements are visible
  async launchSimulation(selectedLanguage: string) {
    const translations = selectedLanguage === 'English' ? enTranslations : frTranslations;
    await this.launchSimulationButton.click();
    await expect(this.simulationLoader).toBeVisible();
    const loaderText = await this.simulationLoader.textContent();
    expect(loaderText).toContain(translations.simulation.averageRequestTime);
    await expect(this.cancelSimulationButton).toBeVisible();
    await expect(this.simulationList).toBeVisible();
  }

  async verifyTableData(tableDataPath: string): Promise<void> {
    // Load expected data from JSON file
    const jsonData: TableRow[] = readJsonFile(tableDataPath);

    // Extract rows from the HTML table and map each row's data to match JSON structure
    const tableRows = await this.page.$$eval('.table-results tbody tr', (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll('td');
        return {
          index: Number(cells[0]?.textContent?.trim()) || 0,
          operationalPoint: cells[1]?.textContent?.trim() || '',
          code: cells[2]?.textContent?.trim() || '',
          endStop: cells[3]?.textContent?.trim() || '',
          passageStop: cells[4]?.textContent?.trim() || '',
          startStop: cells[5]?.textContent?.trim() || '',
          weight: cells[6]?.textContent?.trim() || '',
          refEngine: cells[7]?.textContent?.trim() || '',
        };
      })
    );

    // Compare JSON data and table rows by index for consistency
    jsonData.forEach((jsonRow, index) => {
      const tableRow = tableRows[index];

      // Check if the row exists in the HTML table
      if (!tableRow) {
        console.error(`Row ${index + 1} is missing in the HTML table`);
        return;
      }
      expect(tableRow.operationalPoint).toBe(jsonRow.operationalPoint);
      expect(tableRow.code).toBe(jsonRow.code);
      expect(tableRow.endStop).toBe(jsonRow.endStop);
      expect(tableRow.passageStop).toBe(jsonRow.passageStop);
      expect(tableRow.startStop).toBe(jsonRow.startStop);
      expect(tableRow.weight).toBe(jsonRow.weight);
      expect(tableRow.refEngine).toBe(jsonRow.refEngine);
    });
  }

  async retainSimulation() {
    await this.retainSimulationButton.click();
    await expect(this.downloadSimulationButton).toBeVisible();
    await expect(this.startNewQueryButton).toBeVisible();

    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadSimulationButton.click({ force: true });
    const download = await downloadPromise;

    // Verify the downloaded file name starts with "STDCM" and ends with ".pdf"
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/^STDCM.*\.pdf$/);

    // Save the downloaded file in a temporary directory
    const downloadPath = await download.path();
    if (downloadPath) {
      console.info(`The PDF was successfully downloaded to: ${downloadPath}`);
    } else {
      throw new Error('Download failed');
    }
  }
}
export default STDCMPage;
