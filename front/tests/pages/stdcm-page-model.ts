import { expect, type Locator, type Page } from '@playwright/test';

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
    this.launchSimulationButton = page.getByTestId('launch-simulation-button');
    this.originChField = this.originCard.locator('[id^="id"][id$="-ch"]');
    this.destinationChField = this.destinationCard.locator('[id^="id"][id$="-ch"]');
    this.originCiField = this.originCard.locator('[id^="id"][id$="-ci"]');
    this.destinationCiField = this.destinationCard.locator('[id^="id"][id$="-ci"]');
    this.viaIcon = page.locator('.stdcm-via-icons');
    this.viaDeleteButton = page.getByTestId('delete-via-button');
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

  // Verifies STDCM elements are visible
  async verifyStdcmElementsVisibility() {
    const elements = [
      this.debugButton,
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

  // Verifies all input fields are empty
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
}
export default STDCMPage;
