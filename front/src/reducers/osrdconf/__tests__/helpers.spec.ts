import { omit } from 'lodash';
import { describe, it, expect } from 'vitest';

import { insertViaFromMap } from '../helpers';
import commonConfBuilder from '../osrdConfCommon/__tests__/commonConfBuilder';

describe('insertViaFromMap', () => {
  const testDataBuilder = commonConfBuilder();
  const pathStepsData = testDataBuilder.buildPathSteps();
  const [brest, rennes, lemans, paris, strasbourg] = pathStepsData;
  const pathProperties = testDataBuilder.buildPathProperties();

  // Those are not supposed to have the position on path, its calculated by the helper
  const [rennesNoPosition, lemansNoPosition, parisNoPosition] = [rennes, lemans, paris].map(
    (step) => omit(step, ['positionOnPath'])
  );

  it('should handle insertion for a route with no existing via and no origin', () => {
    const pathSteps = [null, strasbourg];
    const result = insertViaFromMap(pathSteps, paris, pathProperties);
    expect(result).toStrictEqual([null, parisNoPosition, strasbourg]);
  });

  it('should handle insertion for a route with no existing via and no destination', () => {
    const pathSteps = [brest, null];
    const result = insertViaFromMap(pathSteps, rennes, pathProperties);
    expect(result).toStrictEqual([brest, rennesNoPosition, null]);
  });

  it('should handle insertion for a route with no existing via', () => {
    const pathSteps = [brest, strasbourg];
    const result = insertViaFromMap(pathSteps, lemans, pathProperties);
    expect(result).toStrictEqual([brest, lemansNoPosition, strasbourg]);
  });

  it('should correctly append a new via point when the existing via is closer to the origin', () => {
    const pathSteps = [brest, rennes, strasbourg];
    const result = insertViaFromMap(pathSteps, lemans, pathProperties);
    expect(result).toStrictEqual([brest, rennes, lemansNoPosition, strasbourg]);
  });

  it('should insert a via between two existing ones based on distance from origin', () => {
    const pathSteps = [brest, rennes, paris, strasbourg];
    const result = insertViaFromMap(pathSteps, lemans, pathProperties);
    expect(result).toStrictEqual([brest, rennes, lemansNoPosition, paris, strasbourg]);
  });

  it('should insert a via at the end of the route', () => {
    const pathSteps = [brest, rennes, lemans, strasbourg];
    const result = insertViaFromMap(pathSteps, paris, pathProperties);
    expect(result).toStrictEqual([brest, rennes, lemans, parisNoPosition, strasbourg]);
  });
});
