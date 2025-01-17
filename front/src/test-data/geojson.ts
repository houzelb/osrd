import { lineString as turfLineString } from '@turf/helpers';
import type { LineString, Feature, Position } from 'geojson';
import { random } from 'lodash';

/**
 * Creates a random position from a range
 * @param valueRange the range [min, max] where the values belong
 */
function position(valueRange: [number, number]): Position;
/**
 * Creates a json position from x and y values
 * @param x x coordinate
 * @param y y coordinate
 */
function position(x: number, y: number): Position;
function position(arg1: number | [number, number], arg2?: number): Position {
  if (Array.isArray(arg1)) {
    return [random(arg1[0], arg1[1]), random(arg1[0], arg1[1])];
  }
  if (!arg2) {
    throw new Error('y coordinate is not optional');
  }
  return [arg1, arg2];
}

/**
 * Creates a random lineString
 */
export function lineString(): Feature<LineString>;
/**
 * Creates a random lineString from a length and a range
 * @param length the length of the linestring
 * @param valueRange the range [min, max] where the values belong
 */
export function lineString(length: number, valueRange: [number, number]): Feature<LineString>;
/**
 * Creates a geojson lineString from an array of Position
 * @param positions
 */
export function lineString(positions: Position[]): Feature<LineString>;
export function lineString(
  arg1?: number | Position[],
  arg2?: [number, number]
): Feature<LineString> {
  if (typeof arg1 === 'number' || !arg1) {
    const length = arg1 || random(2, 5, false);
    const valueRange = arg2 || [random(), random()];
    const positions = Array.from({ length }).map(() => position(valueRange));
    return turfLineString(positions);
  }
  return turfLineString(arg1);
}
