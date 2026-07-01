/** 24h rain verdict for a station, produced by `rain-report.service.ts`. */
export interface RainReport {
  stationCode: string;
  stationName: string;
  didRain: boolean;
  mm: number;
}
