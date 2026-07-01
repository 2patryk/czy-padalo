import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Station, StationHistory } from '../models/station.model';

export const STATIONS_URL = 'https://hydro-back.imgw.pl/list/meteo';
const STATION_DATA_URL = 'https://hydro-back.imgw.pl/station/meteo/data';
export const STATIONS_CACHE_TTL_MS = 60 * 60 * 1000;
const STATION_HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * hydro-back.imgw.pl returns 403 without browser-like headers — see PLAN.md gotchas.
 * Calls from the browser go through our own `/api/stations` instead (see `server.ts`),
 * since the browser can't be trusted to send these headers reliably and would hit CORS anyway.
 */
export const IMGW_HEADERS = new HttpHeaders({
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://hydro.imgw.pl/',
});

@Service()
export class ImgwApiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private stationsCache: { data$: Observable<Station[]>; expiresAt: number } | null = null;
  private readonly stationHistoryCache = new Map<
    string,
    { data$: Observable<StationHistory>; expiresAt: number }
  >();

  getStations(): Observable<Station[]> {
    const now = Date.now();
    if (this.stationsCache && this.stationsCache.expiresAt > now) {
      return this.stationsCache.data$;
    }

    const data$ = isPlatformBrowser(this.platformId)
      ? this.http.get<Station[]>('/api/stations').pipe(shareReplay(1))
      : this.http.get<Station[]>(STATIONS_URL, { headers: IMGW_HEADERS }).pipe(shareReplay(1));
    this.stationsCache = { data$, expiresAt: now + STATIONS_CACHE_TTL_MS };
    return data$;
  }

  /** `code` is the station's `code` field, not `id` — see PLAN.md gotchas. */
  getStationHistory(code: string, hoursInterval: number): Observable<StationHistory> {
    const cacheKey = `${code}:${hoursInterval}`;
    const now = Date.now();
    const cached = this.stationHistoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data$;
    }

    const params = new HttpParams().set('id', code).set('hoursInterval', hoursInterval);
    const data$ = this.http
      .get<StationHistory>(STATION_DATA_URL, { headers: IMGW_HEADERS, params })
      .pipe(shareReplay(1));
    this.stationHistoryCache.set(cacheKey, {
      data$,
      expiresAt: now + STATION_HISTORY_CACHE_TTL_MS,
    });
    return data$;
  }
}
