import { expect, type Locator, type Page } from '@playwright/test';

class STDCMPage {
  readonly page: Page;

  readonly debugButton: Locator;

  readonly notificationHeader: Locator;

  readonly consistCard: Locator;

  readonly originCard: Locator;

  readonly viaButtonCard: Locator;

  readonly destinationCard: Locator;

  readonly mapContainer: Locator;

  readonly tractionEngineField: Locator;

  readonly tonnageField: Locator;

  readonly lengthField: Locator;

  readonly codeCompoField: Locator;

  readonly maxSpeedField: Locator;

  readonly originCI: Locator;

  readonly originCH: Locator;

  readonly destinationCI: Locator;

  readonly destinationCH: Locator;

  readonly addViaButton: Locator;

  readonly viaIcon: Locator;

  readonly viaDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.notificationHeader = page.locator('#notification');
    this.debugButton = page.getByTestId('stdcm-debug-button');
    this.mapContainer = page.locator('#map-container');
    this.consistCard = page.locator('.stdcm-v2-consist-container .stdcm-v2-card');
    this.originCard = page.locator('.stdcm-v2-card:has(.stdcm-origin-icon)');
    this.viaButtonCard = page.locator('.stdcm-v2-card:has(.stdcm-v2-default-card-icon)');
    this.destinationCard = page.locator('.stdcm-v2-card:has(.stdcm-destination-icon)');
    this.tractionEngineField = page.locator('#tractionEngine');
    this.tonnageField = page.locator('#tonnage');
    this.lengthField = page.locator('#length');
    this.codeCompoField = page.locator('#speed-limit-by-tag-selector');
    this.maxSpeedField = page.locator('#maxSpeed');
    this.originCI = page.locator('#origin-ci');
    this.originCH = page.locator('#origin-ch');
    this.destinationCI = page.locator('#destination-ci');
    this.destinationCH = page.locator('#destination-ch');
    this.addViaButton = page.getByTestId('add-via-button');
    this.viaIcon = page.locator('.stdcm-v2-via-icons');
    this.viaDeleteButton = page.getByTestId('delete-via-button');
  }

  private getViaCard(viaNumber: number): Locator {
    return this.page.locator(`.stdcm-v2-card:has(.stdcm-v2-via-icons:has-text("${viaNumber}"))`);
  }

  private getViaCh(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('[id^="id"][id$="-ch"]');
  }

  private getViaCi(viaNumber: number): Locator {
    return this.getViaCard(viaNumber).locator('[id^="id"][id$="-ci"]');
  }

  async verifyStdcmElementsVisibility() {
    expect(this.debugButton).toBeVisible();
    expect(this.notificationHeader).toBeVisible();
    expect(this.consistCard).toBeVisible();
    expect(this.originCard).toBeVisible();
    expect(this.viaButtonCard).toBeVisible();
    expect(this.destinationCard).toBeVisible();
    expect(this.mapContainer).toBeVisible();
  }

  async verifyAllFieldsEmpty() {
    await expect(this.tractionEngineField).toHaveValue('');
    await expect(this.tonnageField).toHaveValue('');
    await expect(this.lengthField).toHaveValue('');
    await expect(this.codeCompoField).toHaveValue('__PLACEHOLDER__');
    await expect(this.maxSpeedField).toHaveValue('');
    await expect(this.originCI).toHaveValue('');
    await expect(this.originCH).toHaveValue('');
    await expect(this.destinationCI).toHaveValue('');
    await expect(this.destinationCH).toHaveValue('');
  }

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
