import { toPrecipIconVariant } from './precip-icon-variant';

describe('toPrecipIconVariant', () => {
  it('returns "unknown" when there is no reading, regardless of mm', () => {
    expect(toPrecipIconVariant(0, false)).toBe('unknown');
    expect(toPrecipIconVariant(5, false)).toBe('unknown');
  });

  it('returns "no-precip" for 0mm', () => {
    expect(toPrecipIconVariant(0, true)).toBe('no-precip');
  });

  it('returns "light" for a small positive amount', () => {
    expect(toPrecipIconVariant(0.1, true)).toBe('light');
    expect(toPrecipIconVariant(9.9, true)).toBe('light');
  });

  it('returns "heavy" at and above the 10mm threshold', () => {
    expect(toPrecipIconVariant(10, true)).toBe('heavy');
    expect(toPrecipIconVariant(25, true)).toBe('heavy');
  });
});
