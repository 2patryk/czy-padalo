/** 24h rain verdict for a station, produced by `rain-report.service.ts`. */
export interface RainReport {
  stationCode: string;
  stationName: string;
  didRain: boolean;
  mm: number;
  /** `false` if the station's `precip24HoursSum` was `null` (no reading, not necessarily no rain). */
  hasData: boolean;
  lastHourMm: number;
  dailyMm: number;
  sixHourMm: number;
  twelveHourMm: number;
}
