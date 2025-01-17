import fs from 'fs';
import path from 'path';

import { expect } from '@playwright/test';

import type { Simulation } from './types';

/**
 * Find the first PDF file in a directory.
 * @param directory - The directory to search in.
 * @returns The absolute path to the PDF file, or `null` if no PDF file is found.
 */
export function findFirstPdf(directory: string): string | null {
  try {
    const pdfFile = fs.readdirSync(directory).find((file) => file.endsWith('.pdf'));
    if (!pdfFile) {
      console.error(`No PDF files found in directory: ${directory}`);
      return null;
    }
    return path.resolve(directory, pdfFile);
  } catch (error) {
    console.error(`Error reading directory: ${directory}`, error);
    return null;
  }
}

/**
 * Verify the PDF content against the expected simulation.
 * @param pdfText The text extracted from the PDF.
 * @param expectedSimulation The expected simulation data.
 */
export function verifySimulationContent(pdfText: string, expectedSimulation: Simulation) {
  const textChecks = [
    expectedSimulation.header.toolDescription,
    expectedSimulation.header.documentTitle,
    expectedSimulation.applicationDate,
    expectedSimulation.applicationDateValue,
    expectedSimulation.trainDetails.compositionCode,
    expectedSimulation.trainDetails.compositionCodeValue,
    expectedSimulation.trainDetails.towedMaterial,
    expectedSimulation.trainDetails.towedMaterialValue,
    expectedSimulation.trainDetails.maxSpeed,
    expectedSimulation.trainDetails.maxSpeedValue,
    expectedSimulation.trainDetails.maxTonnage,
    expectedSimulation.trainDetails.maxTonnageValue,
    expectedSimulation.trainDetails.referenceEngine,
    expectedSimulation.trainDetails.referenceEngineValue,
    expectedSimulation.trainDetails.maxLength,
    expectedSimulation.trainDetails.maxLengthValue,
    expectedSimulation.simulationDetails.totalDistance,
    ...Object.values(expectedSimulation.requestedRoute).flatMap((route) =>
      [
        route.name,
        route.ch,
        route.arrivalTime,
        route.plusTolerance,
        route.minusTolerance,
        route.stop,
        route.departureTime,
        route.reason,
      ].filter(Boolean)
    ),
    ...Object.values(expectedSimulation.simulationDetails.simulationRoute).flatMap((route) =>
      [
        route.name,
        route.ch,
        route.track,
        route.arrivalTime,
        route.passageTime,
        route.departureTime,
        route.tonnage,
        route.length,
        route.referenceEngine,
        route.stopType,
      ].filter(Boolean)
    ),
    expectedSimulation.simulationDetails.disclaimer,
  ];
  textChecks.forEach((check) => expect(pdfText).toContain(check));
}
