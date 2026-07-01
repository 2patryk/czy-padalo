/**
 * Shapes below are derived from real sample responses of the IMGW hydro API
 * (see PLAN.md "Data source" for endpoint details and gotchas).
 */

/** A precipitation value tied to a single point in time, e.g. `lastHourPrecip`. */
export interface PrecipReading {
  date: string;
  value: number;
}

/** A precipitation sum over a time range, e.g. `precip24HoursSum`. */
export interface PrecipRangeSum {
  range: {
    from: string;
    to: string;
  };
  value: number;
}

export type StationStatusCode =
  'no-precip' | 'precip' | 'high-precip' | 'no-precip-data' | 'no-hours-precip-data';

/** A meteo station as returned by `GET /list/meteo`. `id` !== `code` — see PLAN.md gotchas. */
export interface Station {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  statusCode: StationStatusCode;
  lastHourPrecip: PrecipReading | null;
  dailyPrecip: PrecipReading | null;
  precip24HoursSum: PrecipRangeSum | null;
}

/** An hourly precipitation history entry, as returned by `GET /station/meteo/data`. */
export interface StationHistory {
  precip: PrecipReading[];
}
