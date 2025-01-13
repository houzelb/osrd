export type Simulation = {
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
};
