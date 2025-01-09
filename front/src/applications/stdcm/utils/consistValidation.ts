import { kgToT, msToKmh } from 'utils/physics';

export const CONSIST_TOTAL_MASS_MAX = 10000; // ton
export const CONSIST_TOTAL_LENGTH_MAX = 750; // m
export const CONSIST_MAX_SPEED_MIN = 30; // km/h

export const validateTotalMass = ({
  tractionEngineMass = 0,
  towedMass = 0,
  totalMass,
}: {
  tractionEngineMass?: number;
  towedMass?: number;
  totalMass?: number;
}) => {
  if (!totalMass) {
    return undefined;
  }

  if (totalMass <= 0) {
    return 'consist.errors.totalMass.negative';
  }

  const tractionMassInTons = kgToT(tractionEngineMass);
  const consistMassInTons = Math.floor(kgToT(tractionEngineMass + towedMass));
  const massLimit = towedMass ? consistMassInTons : tractionMassInTons;

  if (totalMass < massLimit || totalMass >= CONSIST_TOTAL_MASS_MAX) {
    return 'consist.errors.totalMass.range';
  }

  return undefined;
};

export const validateTotalLength = ({
  tractionEngineLength = 0,
  towedLength = 0,
  totalLength,
}: {
  tractionEngineLength?: number;
  towedLength?: number;
  totalLength?: number;
}) => {
  if (!totalLength) {
    return undefined;
  }

  if (totalLength <= 0) {
    return 'consist.errors.totalLength.negative';
  }

  const consistLength = Math.floor(tractionEngineLength + towedLength);

  if (totalLength < consistLength || totalLength >= CONSIST_TOTAL_LENGTH_MAX) {
    return 'consist.errors.totalLength.range';
  }

  return undefined;
};

export const validateMaxSpeed = (maxSpeed?: number, tractionEngineMaxSpeed?: number) => {
  if (!maxSpeed) {
    return undefined;
  }

  if (maxSpeed <= 0) {
    return 'consist.errors.maxSpeed.negative';
  }

  if (
    maxSpeed < CONSIST_MAX_SPEED_MIN ||
    (tractionEngineMaxSpeed && maxSpeed > Math.floor(msToKmh(tractionEngineMaxSpeed)))
  ) {
    return 'consist.errors.maxSpeed.range';
  }

  return undefined;
};
