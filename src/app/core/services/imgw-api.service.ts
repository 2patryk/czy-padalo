import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Station, StationHistory } from '../models/station.model';

const STATIONS_URL = 'https://hydro-back.imgw.pl/list/meteo';
const STATION_DATA_URL = 'https://hydro-back.imgw.pl/station/meteo/data';
const STATIONS_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * hydro-back.imgw.pl returns 403 without browser-like headers — see PLAN.md gotchas.
 * All calls in this service run server-side only (SSR).
 */
const IMGW_HEADERS = new HttpHeaders({
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://hydro.imgw.pl/',
});

@Service()
export class ImgwApiService {
  private readonly http = inject(HttpClient);
  private stationsCache: { data$: Observable<Station[]>; expiresAt: number } | null = null;

  getStations(): Observable<Station[]> {
    const now = Date.now();
    if (this.stationsCache && this.stationsCache.expiresAt > now) {
      return this.stationsCache.data$;
    }

    const data$ = this.http
      .get<Station[]>(STATIONS_URL, { headers: IMGW_HEADERS })
      .pipe(shareReplay(1));
    this.stationsCache = { data$, expiresAt: now + STATIONS_CACHE_TTL_MS };
    return data$;
  }

  /** `code` is the station's `code` field, not `id` — see PLAN.md gotchas. */
  getStationHistory(code: string, hoursInterval: number): Observable<StationHistory> {
    const params = new HttpParams().set('id', code).set('hoursInterval', hoursInterval);
    return this.http.get<StationHistory>(STATION_DATA_URL, { headers: IMGW_HEADERS, params });
  }
}
