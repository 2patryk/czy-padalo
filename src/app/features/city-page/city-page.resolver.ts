import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CITIES } from '../../core/data/cities';
import { RainReport } from '../../core/models/rain-report.model';
import { RainReportService } from '../../core/services/rain-report.service';

/** Returns `null` for an unknown slug — redirect handling is added in a later step. */
export const cityPageResolver: ResolveFn<RainReport | null> = (
  route,
): Observable<RainReport | null> => {
  const rainReportService = inject(RainReportService);
  const slug = route.paramMap.get('citySlug');
  const city = CITIES.find((c) => c.slug === slug);

  if (!city) {
    return of(null);
  }

  return rainReportService.getRainReport(city.stationCode);
};
