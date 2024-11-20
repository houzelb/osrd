import fs from 'fs';

import { type Locator, type Page, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

import { getInfraById } from './api-setup';

/**
 * Fill the input field identified by ID or TestID with the specified value and verifies it.
 *
 * @param  page - The Playwright page object.
 * @param inputId - The ID or TestID of the input field.
 * @param value - The value to fill into the input field.
 * @param isTestId - Optional. If true, uses TestID instead of ID for locating the input field.
 */
export async function fillAndCheckInputById(
  page: Page,
  inputId: string,
  value: string | number,
  isTestId: boolean = false
) {
  const input = isTestId ? page.getByTestId(inputId) : page.locator(`#${inputId}`);

  await input.click();
  await input.fill(`${value}`);
  expect(await input.inputValue()).toBe(`${value}`);
}

/**
 * Verify the content of the input field identified by ID or TestID.
 *
 * @param page - The Playwright page object.
 * @param inputId - The ID or TestID of the input field.
 * @param expectedValue - The expected value to verify in the input field.
 * @param isTestId - Optional. If true, uses TestID instead of ID for locating the input field.
 */
export async function verifyAndCheckInputById(
  page: Page,
  inputId: string,
  expectedValue: string | number,
  isTestId: boolean = false
) {
  const input = isTestId ? page.getByTestId(inputId) : page.locator(`#${inputId}`);

  expect(await input.inputValue()).toContain(`${expectedValue}`);
}

/**
 * Generate a unique name by appending a truncated UUID to the base name.
 *
 * @param baseName - The base name to append the UUID segment to.
 * @returns {string} - The generated unique name.
 */
export const generateUniqueName = (baseName: string): string => {
  const uuidSegment = uuidv4().slice(0, 6);
  return `${baseName}-${uuidSegment}`;
};

/**
 * Extract the first sequence of digits found in a string and returns it as a number.
 * Return 0 if no digits are found.
 *
 * @param input - The string to extract the number from.
 * @returns {Promise<number>} - The extracted number or 0 if none found.
 */
export async function extractNumberFromString(input: string): Promise<number> {
  const match = input.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Read a JSON file from the specified path and returns its parsed content.
 *
 * @param path - The file path of the JSON file.
 * @returns {any} - The parsed JSON content.
 */
export const readJsonFile = (path: string) => JSON.parse(fs.readFileSync(path, 'utf8'));

/**
 * Click on the specified element and waits for a specified delay after the click.
 *
 * @param element - locator object representing the element to click.
 * @param delay - Optional. The delay in milliseconds to wait after clicking the element. Defaults to 500ms.
 *
 * @returns {Promise<void>} - A promise that resolves after the element is clicked and the delay has passed.
 */
export async function clickWithDelay(element: Locator, delay = 500): Promise<void> {
  await element.click();
  await element.page().waitForTimeout(delay);
}

/**
 * Convert a date string from YYYY-MM-DD format to "DD mmm YYYY" format.
 * @param dateString - The input date string in YYYY-MM-DD format.
 * @returns The formatted date string in "DD mmm YYYY" format.
 */
export function formatDateToDayMonthYear(dateString: string): string {
  const date = new Date(dateString);

  // Format the date to "15 Oct 2024" using toLocaleDateString
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Convert the short month (first letter capitalized) to lowercase
  return formattedDate.replace(/([A-Z])/g, (match) => match.toLowerCase());
}
/**
 * Waits until the infrastructure state becomes 'CACHED' before proceeding to the next step.
 * The function polls the `infra.state` every 10 seconds, up to a total of 3 minutes.
 * Displays the total time taken for the state to reach 'CACHED'.
 *
 * @param infraId - The ID of the infrastructure to retrieve and check.
 * @throws {Error} - Throws an error if the state does not become 'CACHED' within 5 minutes.
 * @returns {Promise<void>} - Resolves when the state is 'CACHED'.
 */
export const waitForInfraStateToBeCached = async (infraId: number): Promise<void> => {
  const maxRetries = 18; // Total attempts (3 minutes / 10 seconds)
  const delay = 10000; // Delay in milliseconds (10 seconds)
  const startTime = Date.now(); // Record start time

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const infra = await getInfraById(infraId); // Retrieve the latest infra object
    if (infra.state === 'CACHED') {
      const totalTime = Date.now() - startTime;
      console.info(
        `Infrastructure state is 'CACHED'. Total time taken: ${totalTime / 1000} seconds.`
      );
      return;
    }
    console.info(
      `Attempt ${attempt + 1}: Infrastructure current state is '${infra.state}', waiting...`
    );
    await new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  throw new Error("Infrastructure state did not reach 'CACHED' within the allotted 3 minutes.");
};
