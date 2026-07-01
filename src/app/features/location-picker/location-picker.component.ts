import { Component, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { RainReport } from '../../core/models/rain-report.model';
import { GeolocationService } from '../../core/services/geolocation.service';
import { RainReportService } from '../../core/services/rain-report.service';
import { StationsService } from '../../core/services/stations.service';
import { RainVerdictComponent } from '../rain-verdict/rain-verdict.component';

type LocationPickerStatus = 'idle' | 'loading' | 'error' | 'success';

interface LocationResult {
  report: RainReport;
  distanceKm: number;
}

@Component({
  selector: 'app-location-picker',
  imports: [RainVerdictComponent],
  template: `
    <div class="location-picker">
      <button type="button" (click)="useMyLocation()" [disabled]="status() === 'loading'">
        Użyj mojej lokalizacji
      </button>

      @switch (status()) {
        @case ('loading') {
          <p>Szukanie najbliższej stacji…</p>
        }
        @case ('error') {
          <p role="alert">Nie udało się ustalić lokalizacji.</p>
        }
        @case ('success') {
          @if (result(); as result) {
            <app-rain-verdict [report]="result.report" [distanceKm]="result.distanceKm" />
          }
        }
      }
    </div>
  `,
})
export class LocationPickerComponent {
  private readonly geolocation = inject(GeolocationService);
  private readonly stations = inject(StationsService);
  private readonly rainReport = inject(RainReportService);

  protected readonly status = signal<LocationPickerStatus>('idle');
  protected readonly result = signal<LocationResult | null>(null);

  useMyLocation(): void {
    this.status.set('loading');
    this.result.set(null);

    this.geolocation
      .getCurrentPosition()
      .pipe(
        switchMap((coords) => this.stations.findNearestStation(coords)),
        switchMap((nearest) => {
          if (!nearest) {
            return of(null);
          }

          return this.rainReport
            .getRainReport(nearest.station.code)
            .pipe(map((report) => (report ? { report, distanceKm: nearest.distanceKm } : null)));
        }),
        catchError(() => of(null)),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'success' : 'error');
      });
  }
}
