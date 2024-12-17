import { expect, type Locator, type Page } from '@playwright/test';

import enTranslations from '../../public/locales/en/stdcm.json';
import frTranslations from '../../public/locales/fr/stdcm.json';
import { electricRollingStockName } from '../assets/project-const';
import {
  CI_SUGGESTIONS,
  DEFAULT_DETAILS,
  DESTINATION_DETAILS,
  LIGHT_DESTINATION_DETAILS,
  LIGHT_ORIGIN_DETAILS,
  ORIGIN_DETAILS,
  VIA_STOP_TIMES,
  VIA_STOP_TYPES,
} from '../assets/stdcm-const';
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

  readonly launchSimulationButton: Locator;

  readonly originChField: Locator;

  readonly destinationChField: Locator;

  readonly originCiField: Locator;

  readonly destinationCiField: Locator;

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

  readonly incrementButton: Locator;

  readonly allViasButton: Locator;

  readonly retainSimulationButton: Locator;

  readonly downloadSimulationButton: Locator;

  readonly startNewQueryButton: Locator;

  readonly originMarker: Locator;

  readonly destinationMarker: Locator;

  readonly viaMarker: Locator;

  readonly mapResultContainer: Locator;

  readonly originResultMarker: Locator;

  readonly destinationResultMarker: Locator;

  readonly viaResultMarker: Locator;

  readonly helpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.notificationHeader = page.locator('#notification');
    this.debugButton = page.getByTestId('stdcm-debug-button');
    this.helpButton = page.getByTestId('stdcm-help-button');
    this.mapContainer = page.locator('#map-container');
    this.consistCard = page.locator('.stdcm-consist-container .stdcm-card');
    this.originCard = page.locator('.stdcm-card:has(.stdcm-origin-icon)');
    this.destinationCard = page.locator('.stdcm-card:has(.stdcm-destination-icon)');
    this.tractionEngineField = page.locator('#tractionEngine');
    this.tonnageField = page.locator('#tonnage');
    this.lengthField = page.locator('#length');
    this.codeCompoField = page.locator('#speed-limit-by-tag-selector');
    this.maxSpeedField = page.locator('#maxSpeed');
    this.addViaButton = page.locator('.stdcm-vias-list button .stdcm-card__body.add-via');
    this.launchSimulationButton = page.getByTestId('launch-simulation-button');
    this.originChField = this.originCard.locator('[id^="id"][id$="-ch"]');
    this.destinationChField = this.destinationCard.locator('[id^="id"][id$="-ch"]');
    this.originCiField = this.originCard.locator('[id^="id"][id$="-ci"]');
    this.destinationCiField = this.destinationCard.locator('[id^="id"][id$="-ci"]');
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
    this.incrementButton = page.locator('.minute-button', { hasText: '+1mn' });
    this.allViasButton = page.getByTestId('all-vias-button');
    this.retainSimulationButton = page.getByTestId('retain-simulation-button');
    this.downloadSimulationButton = page.getByTestId('download-simulation-button');
    this.startNewQueryButton = page.getByTestId('start-new-query-button');
    this.originMarker = this.mapContainer.locator('img[alt="origin"]');
    this.destinationMarker = this.mapContainer.locator('img[alt="destination"]');
    this.viaMarker = this.mapContainer.locator('img[alt="via"]');
    this.mapResultContainer = page.locator('#map-result');
    this.originResultMarker = this.mapResultContainer.locator('img[alt="origin"]');
    this.destinationResultMarker = this.mapResultContainer.locator('img[alt="destination"]');
    this.viaResultMarker = this.mapResultContainer.locator('img[alt="via"]');
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
    return this.getViaCard(viaNumber).locator('.status-message');
  }

  private async setMinuteLocator(minuteValue: string) {
    const minuteLocator = this.page.locator('.time-grid .minute', { hasText: minuteValue });
    await minuteLocator.click();
  }

  private async setHourLocator(hourValue: string) {
    const hourLocator = this.page.locator('.time-grid .hour', { hasText: hourValue });
    await hourLocator.click();
  }

  private async verifySuggestions(expectedSuggestions: string[]) {
    await expect(this.suggestionList).toBeVisible();
    expect(await this.suggestionItems.count()).toBe(expectedSuggestions.length);
    const actualSuggestions = await this.suggestionItems.allTextContents();
    expect(actualSuggestions).toEqual(expectedSuggestions);
  }

  // Verify STDCM elements are visible
  async verifyStdcmElementsVisibility() {
    const elements = [
      this.debugButton,
      this.helpButton,
      this.notificationHeader,
      this.consistCard,
      this.originCard,
      this.addViaButton,
      this.destinationCard,
      this.mapContainer,
      this.launchSimulationButton,
    ];
    for (const element of elements) {
      await expect(element).toBeVisible();
    }
  }

  // Verify all input fields are empty
  async verifyAllFieldsEmpty() {
    const emptyFields = [
      this.tractionEngineField,
      this.tonnageField,
      this.lengthField,
      this.maxSpeedField,
      this.originCiField,
      this.destinationCiField,
      this.originChField,
      this.destinationChField,
    ];
    for (const field of emptyFields) await expect(field).toHaveValue('');
    await expect(this.codeCompoField).toHaveValue('__PLACEHOLDER__');
  }

  // Add a via card, verify fields, and delete it
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

  // Verify the origin suggestions when searching for north
  async verifyOriginNorthSuggestions() {
    await this.verifySuggestions(CI_SUGGESTIONS.north);
  }

  // Verify the destination suggestions when searching for south
  async verifyDestinationSouthSuggestions() {
    await this.verifySuggestions(CI_SUGGESTIONS.south);
  }

  // Fill fields with test values in the consist section
  async fillConsistDetails() {
    await this.tractionEngineField.fill(electricRollingStockName);
    await this.tractionEngineField.press('ArrowDown');
    await this.tractionEngineField.press('Enter');
    await this.tractionEngineField.dispatchEvent('blur');
    await this.tonnageField.fill('400');
    await this.lengthField.fill('300');
    await this.codeCompoField.selectOption('HLP');
    await this.maxSpeedField.fill('180');
  }

  // Fill and verify origin details with suggestions
  async fillAndVerifyOriginDetails() {
    const {
      input,
      suggestion,
      chValue,
      arrivalDate,
      arrivalTime,
      tolerance,
      updatedChValue,
      arrivalType,
    } = ORIGIN_DETAILS;
    // Fill and verify origin CI suggestions
    await this.dynamicOriginCi.fill(input);
    await this.verifyOriginNorthSuggestions();
    await this.suggestionNWS.click();
    const originCiValue = await this.dynamicOriginCi.getAttribute('value');
    expect(originCiValue).toContain(suggestion);
    // Verify default values
    await expect(this.dynamicOriginCh).toHaveValue(chValue);
    await expect(this.originArrival).toHaveValue(arrivalType.default);
    await expect(this.dateOriginArrival).toHaveValue(arrivalDate);
    await expect(this.timeOriginArrival).toHaveValue(arrivalTime);
    await expect(this.toleranceOriginArrival).toHaveValue(tolerance);
    // Update and verify origin values
    await this.dynamicOriginCh.selectOption(updatedChValue);
    await expect(this.dynamicOriginCh).toHaveValue(updatedChValue);
    await this.originArrival.selectOption(arrivalType.updated);
    await expect(this.originArrival).toHaveValue(arrivalType.updated);
    // Verify fields are hidden
    await expect(this.dateOriginArrival).not.toBeVisible();
    await expect(this.timeOriginArrival).not.toBeVisible();
    await expect(this.toleranceOriginArrival).not.toBeVisible();
  }

  // Fill and verify destination details based on selected language
  async fillAndVerifyDestinationDetails(selectedLanguage: string) {
    const {
      input,
      suggestion,
      chValue,
      arrivalDate,
      arrivalTime,
      tolerance,
      arrivalType,
      updatedDetails,
    } = DESTINATION_DETAILS;
    const translations = selectedLanguage === 'English' ? enTranslations : frTranslations;
    // Fill destination input and verify suggestions
    await this.dynamicDestinationCi.fill(input);
    await this.verifyDestinationSouthSuggestions();
    await this.suggestionSS.click();
    const destinationCiValue = await this.dynamicDestinationCi.getAttribute('value');
    expect(destinationCiValue).toContain(suggestion);
    // Verify default values
    await expect(this.dynamicDestinationCh).toHaveValue(chValue);
    await expect(this.destinationArrival).toHaveValue(arrivalType.default);
    await expect(this.warningBox).toContainText(translations.stdcmErrors.noScheduledPoint);
    await expect(this.dateDestinationArrival).not.toBeVisible();
    await expect(this.timeDestinationArrival).not.toBeVisible();
    await expect(this.toleranceDestinationArrival).not.toBeVisible();
    // Select 'preciseTime' and verify values
    await this.destinationArrival.selectOption(arrivalType.updated);
    await expect(this.destinationArrival).toHaveValue(arrivalType.updated);
    await expect(this.dateDestinationArrival).toHaveValue(arrivalDate);
    await expect(this.timeDestinationArrival).toHaveValue(arrivalTime);
    await expect(this.toleranceDestinationArrival).toHaveValue(tolerance);
    // Update date and time values
    await this.dateDestinationArrival.fill(updatedDetails.date);
    await expect(this.dateDestinationArrival).toHaveValue(updatedDetails.date);
    await this.timeDestinationArrival.click();
    await this.setHourLocator(updatedDetails.hour);
    await this.setMinuteLocator(updatedDetails.minute);
    await this.incrementButton.dblclick(); // Double-click the +1 minute button to reach 37
    await this.timeDestinationArrival.click();
    await expect(this.timeDestinationArrival).toHaveValue(updatedDetails.timeValue);

    // Update tolerance and verify warning box
    await this.fillToleranceField(
      updatedDetails.tolerance.negative,
      updatedDetails.tolerance.positive,
      false
    );
    await expect(this.warningBox).not.toBeVisible();
  }

  // Fill origin section
  async fillOriginDetailsLight() {
    const { input, chValue, arrivalDate, arrivalTime, tolerance, arrivalType } =
      LIGHT_ORIGIN_DETAILS;
    await this.dynamicOriginCi.fill(input);
    await this.suggestionNWS.click();
    await expect(this.dynamicOriginCh).toHaveValue(chValue);
    await expect(this.originArrival).toHaveValue(arrivalType);
    await this.dateOriginArrival.fill(arrivalDate);
    await this.timeOriginArrival.fill(arrivalTime);
    await this.fillToleranceField(tolerance.negative, tolerance.positive, true);
  }

  // Fill destination section
  async fillDestinationDetailsLight() {
    const { input, chValue, arrivalType } = LIGHT_DESTINATION_DETAILS;
    await this.dynamicDestinationCi.fill(input);
    await this.suggestionSS.click();
    await expect(this.dynamicDestinationCh).toHaveValue(chValue);
    await expect(this.destinationArrival).toHaveValue(arrivalType);
  }

  async fillToleranceField(minusValue: string, plusValue: string, isOrigin: boolean) {
    const toleranceField = isOrigin
      ? this.toleranceOriginArrival
      : this.toleranceDestinationArrival;

    await toleranceField.click();
    await this.page.getByRole('button', { name: minusValue, exact: true }).click();
    await this.page.getByRole('button', { name: plusValue, exact: true }).click();
    await expect(toleranceField).toHaveValue(`${minusValue}/${plusValue}`);
    // TODO : Add a click on the close button instead of clicking on the map when #693 is done
    await this.mapContainer.click();
  }

  async fillAndVerifyViaDetails(viaNumber: number, viaSearch: string, selectedLanguage?: string) {
    const { PASSAGE_TIME, SERVICE_STOP, DRIVER_SWITCH } = VIA_STOP_TYPES;
    const { serviceStop, driverSwitch } = VIA_STOP_TIMES;
    const translations = selectedLanguage === 'English' ? enTranslations : frTranslations;
    const warning = this.getViaWarning(viaNumber);
    // Helper function to fill common fields
    const fillVia = async (selectedSuggestion: Locator) => {
      await this.addViaButton.nth(viaNumber - 1).click();
      expect(await this.addViaButton.count()).toBe(viaNumber + 1);
      await expect(this.getViaCi(viaNumber)).toBeVisible();
      await this.getViaCi(viaNumber).fill(viaSearch);
      await selectedSuggestion.click();
      await expect(this.getViaCh(viaNumber)).toHaveValue(DEFAULT_DETAILS.chValue);
      await expect(this.getViaType(viaNumber)).toHaveValue(PASSAGE_TIME);
    };

    switch (viaSearch) {
      case 'mid_west':
        await fillVia(this.suggestionMWS);
        break;

      case 'mid_east':
        await fillVia(this.suggestionMES);
        await this.getViaType(viaNumber).selectOption(SERVICE_STOP);
        await expect(this.getViaStopTime(viaNumber)).toHaveValue(serviceStop.default);
        await this.getViaStopTime(viaNumber).fill(serviceStop.input);
        await expect(this.getViaStopTime(viaNumber)).toHaveValue(serviceStop.input);
        break;

      case 'nS':
        await fillVia(this.suggestionNS);
        await this.getViaType(viaNumber).selectOption(DRIVER_SWITCH);
        await expect(this.getViaStopTime(viaNumber)).toHaveValue(driverSwitch.default);
        await this.getViaStopTime(viaNumber).fill(driverSwitch.invalidInput);
        await expect(this.getViaStopTime(viaNumber)).toHaveValue(driverSwitch.invalidInput);
        await expect(warning).toBeVisible();
        expect(await warning.textContent()).toEqual(translations.trainPath.warningMinStopTime);

        await this.getViaStopTime(viaNumber).fill(driverSwitch.validInput);
        await expect(this.getViaStopTime(viaNumber)).toHaveValue(driverSwitch.validInput);
        await expect(warning).not.toBeVisible();
        break;

      default:
        throw new Error(`Unsupported viaSearch value: ${viaSearch}`);
    }
  }

  // Launch the simulation and check if simulation-related elements are visible
  async launchSimulation() {
    await expect(this.launchSimulationButton).toBeEnabled();
    await this.launchSimulationButton.click();
    await expect(this.simulationList).toBeVisible();
    // Check map result container visibility only for Chromium browser
    if (this.page.context().browser()?.browserType().name() === 'chromium') {
      await expect(this.mapResultContainer).toBeVisible();
    }
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

  async clickOnAllViaButton() {
    await this.allViasButton.click();
  }

  async clickOnRetainSimulation() {
    await this.retainSimulationButton.click();
  }

  async retainSimulation() {
    await this.clickOnRetainSimulation();
    await expect(this.downloadSimulationButton).toBeVisible();
    await expect(this.downloadSimulationButton).toBeEnabled();
    await expect(this.startNewQueryButton).toBeVisible();
  }

  async downloadSimulation(browserName: string) {
    // Wait for the download event
    await this.page.waitForTimeout(500);
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120000 });
    await this.downloadSimulationButton.dispatchEvent('click');
    const download = await downloadPromise.catch(() => {
      throw new Error('Download event was not triggered.');
    });

    // Verify filename and save the download
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/^STDCM.*\.pdf$/);
    const downloadPath = `./tests/stdcm-results/${browserName}/${suggestedFilename}`;
    await download.saveAs(downloadPath);
    console.info(`The PDF was successfully downloaded to: ${downloadPath}`);
  }

  async clickOnStartNewQueryButton() {
    await this.startNewQueryButton.dispatchEvent('click');
  }

  async mapMarkerVisibility() {
    await expect(this.originMarker).toBeVisible();
    await expect(this.destinationMarker).toBeVisible();
    await expect(this.viaMarker).toBeVisible();
  }

  async mapMarkerResultVisibility() {
    await expect(this.originResultMarker).toBeVisible();
    await expect(this.destinationResultMarker).toBeVisible();
    await expect(this.viaResultMarker).toBeVisible();
  }
}
export default STDCMPage;
