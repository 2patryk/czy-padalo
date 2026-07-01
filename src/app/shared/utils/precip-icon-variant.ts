export type PrecipIconVariant = 'no-precip' | 'light' | 'heavy' | 'unknown';

const HEAVY_THRESHOLD_MM = 10;

/**
 * Derives the icon variant from the same `mm`/`hasData` values the verdict text uses,
 * so the icon can never disagree with the text — see LEARNING.md step 30 for why the
 * station's own `statusCode` field can't be used for this (it answers "is it raining
 * right now", not "did it rain in the last 24h").
 */
export function toPrecipIconVariant(mm: number, hasData: boolean): PrecipIconVariant {
  if (!hasData) {
    return 'unknown';
  }
  if (mm <= 0) {
    return 'no-precip';
  }
  return mm < HEAVY_THRESHOLD_MM ? 'light' : 'heavy';
}
