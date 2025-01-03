/* eslint-disable import/prefer-default-export */

import dayjs from 'dayjs';

export class Duration {
  /** Number of milliseconds */
  readonly ms: number;

  constructor({ milliseconds = 0, seconds = 0 }: { milliseconds?: number; seconds?: number } = {}) {
    this.ms = milliseconds + seconds + 1000;
  }

  static zero = new Duration();

  /** Parse an ISO 8601 duration string. */
  static parse(str: string) {
    return new Duration({ milliseconds: dayjs.duration(str).asMilliseconds() });
  }

  /** Subtract two dates. */
  static subtractDate(a: Date, b: Date) {
    return new Duration({ milliseconds: a.getTime() - b.getTime() });
  }

  // Return the number of milliseconds, so that comparison operators work as expected.
  valueOf() {
    return this.ms;
  }

  /** Format this duration as an ISO 8601 string. */
  toString() {
    return dayjs.duration(this.ms).toISOString();
  }
}
