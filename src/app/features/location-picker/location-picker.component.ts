import { Component, inject, resource, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { RainReport } from '../../core/models/rain-report.model';
import { GeolocationService } from '../../core/services/geolocation.service';
import { RainReportService } from '../../core/services/rain-report.service';
import { StationsService } from '../../core/services/stations.service';
import { RainVerdictComponent } from '../rain-verdict/rain-verdict.component';

type LocationPickerStatus = 'idle' | 'loading' | 'error' | 'success';

interface LocationResult {
  report: RainReport;
  distanceKm: number | null;
}

@Component({
  selector: 'app-location-picker',
  imports: [RainVerdictComponent],
  template: `
    <div class="location-picker">
      <button type="button" (click)="useMyLocation()" [disabled]="status() === 'loading'">
        Użyj mojej lokalizacji
      </button>

      <div class="location-picker__search">
        <label for="station-search">Lub wyszukaj stację</label>
        <input
          id="station-search"
          type="text"
          autocomplete="off"
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)"
          placeholder="np. Warszawa"
        />

        @if (searchResults.value(); as results) {
          @if (results.length > 0) {
            <ul class="location-picker__results">
              @for (station of results; track station.code) {
                <li>
                  <button type="button" (click)="selectStation(station.code)">
                    {{ station.name }}
                  </button>
                </li>
              }
            </ul>
          }
        }
      </div>

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

  protected readonly searchQuery = signal('');
  protected readonly searchResults = resource({
    params: () => this.searchQuery(),
    loader: ({ params: query }) => firstValueFrom(this.stations.searchByName(query)),
  });

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

  selectStation(code: string): void {
    this.status.set('loading');
    this.result.set(null);

    this.rainReport
      .getRainReport(code)
      .pipe(
        map((report) => (report ? { report, distanceKm: null } : null)),
        catchError(() => of(null)),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'success' : 'error');
      });
  }
}
