import type {
  ElectricalPofilelValues,
  ElectrificationValues,
  LayerData,
} from '@osrd-project/ui-speedspacechart/dist/types/chartTypes';
import { describe, it, expect } from 'vitest';

import type { PathPropertiesFormatted, PositionData } from 'applications/operationalStudies/types';

import { simulation } from './sampleData';
import {
  formatSpeeds,
  formatStops,
  formatElectrifications,
  formatSlopes,
  formatElectricalProfiles,
  getProfileValue,
} from '../helpers';

describe('formatSpeeds', () => {
  it('should format speed', () => {
    const expected = [
      { position: { start: 0 }, value: 0 },
      { position: { start: 1 }, value: 36 },
      { position: { start: 2 }, value: 72 },
    ];
    expect(formatSpeeds(simulation.base)).toEqual(expected);
  });
});

describe('formatStops', () => {
  it('should format stops', () => {
    const operationalPoints: PathPropertiesFormatted['operationalPoints'] = [
      {
        position: 0,
        extensions: {
          identifier: { name: 'name', uic: 0 },
          sncf: {
            ch: 'ch',
            ch_long_label: 'ch_long_label',
            ch_short_label: 'ch_short_label',
            ci: 0,
            trigram: 'trigram',
          },
        },
        id: 'id',
        part: {
          position: 0,
          track: 'track',
        },
        weight: null,
      },
    ];
    const expected = [
      {
        position: { start: 0 },
        value: {
          name: 'name ch',
          weight: null,
        },
      },
    ];
    expect(formatStops(operationalPoints)).toEqual(expected);
  });
});

describe('formatElectrifications', () => {
  it('should format electrifications in 1500V', () => {
    const electrifications: PathPropertiesFormatted['electrifications'] = [
      {
        electrificationUsage: {
          type: 'electrification',
          voltage: '1500V',
          electrical_profile_type: 'profile',
          handled: true,
        },
        start: 0,
        stop: 1000,
      },
    ];
    const expected = [
      {
        position: { start: 0, end: 1 },
        value: { type: 'electrification', voltage: '1500V', lowerPantograph: false },
      },
    ];
    expect(formatElectrifications(electrifications)).toEqual(expected);
  });
});

describe('formatSlopes', () => {
  it('should format slopes', () => {
    const slopes: PositionData<'gradient'>[] = [
      { position: 1000, gradient: 0 },
      { position: 2000, gradient: 1 },
    ];
    const expected = [
      { position: { start: 0, end: 1 }, value: 0 },
      { position: { start: 1, end: 2 }, value: 1 },
    ];
    expect(formatSlopes(slopes)).toEqual(expected);
  });
});

describe('getProfileValue', () => {
  it('should return neutral profile if no profile', () => {
    expect(getProfileValue({ electrical_profile_type: 'no_profile' }, '1500V')).toEqual({
      electricalProfile: 'neutral',
    });
  });

  it('should return incompatible if profile is null', () => {
    expect(
      getProfileValue(
        { electrical_profile_type: 'profile', handled: false, profile: null },
        '1500V'
      )
    ).toEqual({
      electricalProfile: 'incompatible',
      color: 'rgb(171, 201, 133)',
    });
  });

  it('should return incompatible if profile is not handled', () => {
    expect(
      getProfileValue({ electrical_profile_type: 'profile', handled: false, profile: 'F' }, '1500V')
    ).toEqual({
      electricalProfile: 'incompatible',
      color: 'rgb(171, 201, 133)',
    });
  });

  it('should return profile value', () => {
    expect(
      getProfileValue({ electrical_profile_type: 'profile', handled: true, profile: 'F' }, '1500V')
    ).toEqual({
      electricalProfile: 'F',
      color: 'rgb(171, 201, 133)',
      heightLevel: 0,
    });
  });
});

describe('formatElectricalProfiles', () => {
  it('should format electrical profiles', () => {
    const lastPosition = 3;

    const electrifications: LayerData<ElectrificationValues>[] = [
      {
        position: {
          start: 0,
          end: 1,
        },
        value: {
          type: 'electrification',
          voltage: '1500V',
          lowerPantograph: false,
        },
      },
      {
        position: {
          start: 1,
          end: 2,
        },
        value: {
          type: 'electrification',
          voltage: '1500V',
          lowerPantograph: false,
        },
      },
      {
        position: {
          start: 2,
          end: lastPosition,
        },
        value: {
          type: 'electrification',
          voltage: '1500V',
          lowerPantograph: false,
        },
      },
    ];
    const expected: LayerData<ElectricalPofilelValues>[] = [
      {
        position: {
          start: 0,
          end: 1,
        },
        value: {
          electricalProfile: 'O',
          color: 'rgb(47, 76, 38)',
          heightLevel: 8,
        },
      },
      {
        position: {
          start: 1,
          end: 2,
        },
        value: {
          electricalProfile: 'A1',
          color: 'rgb(79, 108, 62)',
          heightLevel: 6,
        },
      },
      {
        position: {
          start: 2,
          end: lastPosition,
        },
        value: {
          electricalProfile: 'B',
          color: 'rgb(93, 123, 73)',
          heightLevel: 5,
        },
      },
    ];

    expect(
      formatElectricalProfiles(simulation.electrical_profiles, electrifications, lastPosition)
    ).toEqual(expected);
  });
});
