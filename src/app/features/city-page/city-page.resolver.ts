import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { CITIES } from '../../core/data/cities';
import { RainReport } from '../../core/models/rain-report.model';
import { RainReportService } from '../../core/services/rain-report.service';

/** Redirects to `/` for an unknown slug or a slug whose station has no data. */
export const cityPageResolver: ResolveFn<RainReport | RedirectCommand> = (
  route,
): Observable<RainReport | RedirectCommand> => {
  const rainReportService = inject(RainReportService);
  const router = inject(Router);
  const redirectHome = new RedirectCommand(router.parseUrl('/'));
  const slug = route.paramMap.get('citySlug');
  const city = CITIES.find((c) => c.slug === slug);

  if (!city) {
    return of(redirectHome);
  }

  return rainReportService
    .getRainReport(city.stationCode)
    .pipe(map((report) => report ?? redirectHome));
};
