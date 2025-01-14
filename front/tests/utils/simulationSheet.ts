import fs from 'fs';
import path from 'path';

import { expect } from '@playwright/test';

export interface Simulation {
  header: {
    toolDescription: string;
    documentTitle: string;
  };
  applicationDate: string;
  applicationDateValue: string;
  trainDetails: {
    compositionCode: string;
    compositionCodeValue: string;
    towedMaterial: string;
    towedMaterialValue: string;
    maxSpeed: string;
    maxSpeedValue: string;
    maxTonnage: string;
    maxTonnageValue: string;
    referenceEngine: string;
    referenceEngineValue: string;
    maxLength: string;
    maxLengthValue: string;
  };
  requestedRoute: {
    station1: {
      name: string;
      ch: string;
      arrivalTime?: string | null;
      plusTolerance?: string | null;
      minusTolerance?: string | null;
      stop?: string | null;
      departureTime?: string | null;
      reason: string;
    };
    station2: {
      name: string;
      ch: string;
      arrivalTime?: string | null;
      plusTolerance?: string | null;
      minusTolerance?: string | null;
      stop?: string | null;
      departureTime?: string | null;
      reason: string;
    };
    station3: {
      name: string;
      ch: string;
      arrivalTime?: string | null;
      plusTolerance?: string | null;
      minusTolerance?: string | null;
      stop?: string | null;
      departureTime?: string | null;
      reason: string;
    };
  };
  simulationDetails: {
    totalDistance: string;
    simulationRoute: {
      station1: {
        name: string;
        ch: string;
        track: string;
        arrivalTime?: string | null;
        passageTime?: string | null;
        departureTime?: string | null;
        tonnage: string;
        length: string;
        referenceEngine?: string | null;
        stopType?: string | null;
      };
      station2: {
        name: string;
        ch: string;
        track: string;
        arrivalTime?: string | null;
        passageTime?: string | null;
        departureTime?: string | null;
        tonnage: string;
        length: string;
        referenceEngine?: string | null;
        stopType?: string | null;
      };
      station3: {
        name: string;
        ch: string;
        track: string;
        arrivalTime?: string | null;
        passageTime?: string | null;
        departureTime?: string | null;
        tonnage: string;
        length: string;
        referenceEngine?: string | null;
        stopType?: string | null;
      };
      station4: {
        name: string;
        ch: string;
        track: string;
        arrivalTime?: string | null;
        passageTime?: string | null;
        departureTime?: string | null;
        tonnage: string;
        length: string;
        referenceEngine?: string | null;
        stopType?: string | null;
      };
      station5: {
        name: string;
        ch: string;
        track: string;
        arrivalTime?: string | null;
        passageTime?: string | null;
        departureTime?: string | null;
        tonnage: string;
        length: string;
        referenceEngine?: string | null;
        stopType?: string | null;
      };
    };
    disclaimer: string;
  };
}

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
