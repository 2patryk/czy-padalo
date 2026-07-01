import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { RainReport } from '../models/rain-report.model';
import { ImgwApiService } from './imgw-api.service';

@Service()
export class RainReportService {
  private readonly imgwApi = inject(ImgwApiService);

  /** Returns `null` if no station with the given code exists in the current station list. */
  getRainReport(stationCode: string): Observable<RainReport | null> {
    return this.imgwApi.getStations().pipe(
      map((stations) => {
        const station = stations.find((s) => s.code === stationCode);
        if (!station) {
          return null;
        }

        const mm = station.precip24HoursSum?.value ?? 0;
        return {
          stationCode: station.code,
          stationName: station.name,
          didRain: mm > 0,
          mm,
          hasData: station.precip24HoursSum !== null,
        };
      }),
    );
  }
}
