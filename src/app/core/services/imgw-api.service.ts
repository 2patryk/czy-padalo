import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Station } from '../models/station.model';

const STATIONS_URL = 'https://hydro-back.imgw.pl/list/meteo';

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

  getStations(): Observable<Station[]> {
    return this.http.get<Station[]>(STATIONS_URL, { headers: IMGW_HEADERS });
  }
}
