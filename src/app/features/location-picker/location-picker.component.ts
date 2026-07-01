import { Component, computed, inject, resource, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { GeolocationError } from '../../core/models/geolocation.model';
import { RainReport } from '../../core/models/rain-report.model';
import { GeolocationService } from '../../core/services/geolocation.service';
import { RainReportService } from '../../core/services/rain-report.service';
import { StationsService } from '../../core/services/stations.service';
import { RainVerdictComponent } from '../rain-verdict/rain-verdict.component';

type LocationPickerStatus = 'idle' | 'loading' | 'error' | 'success';
type LocationErrorKind = 'gps-denied' | 'gps-unavailable' | 'network' | 'no-data';

interface LocationResult {
  report: RainReport;
  distanceKm: number | null;
}

const ERROR_MESSAGES: Record<LocationErrorKind, string> = {
  'gps-denied':
    'Odmówiono dostępu do lokalizacji. Włącz uprawnienia w przeglądarce albo wyszukaj stację ręcznie.',
  'gps-unavailable':
    'Nie udało się ustalić lokalizacji. Spróbuj ponownie lub wyszukaj stację ręcznie.',
  network: 'Wystąpił błąd połączenia. Spróbuj ponownie za chwilę.',
  'no-data': 'Brak danych opadowych dla najbliższej stacji.',
};

@Component({
  selector: 'app-location-picker',
  imports: [RainVerdictComponent],
  template: `
    <div class="location-picker">
      <button
        type="button"
        class="location-picker__gps-button"
        (click)="useMyLocation()"
        [disabled]="status() === 'loading'"
      >
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

        @if (searchResults.isLoading()) {
          <p class="location-picker__hint">Szukanie…</p>
        } @else if (searchResults.error()) {
          <p class="location-picker__hint" role="alert">
            Nie udało się wyszukać stacji. Spróbuj ponownie.
          </p>
        } @else if (searchResults.value(); as results) {
          @if (results.length > 0) {
            <ul class="location-picker__results">
              @for (station of results; track station.code) {
                <li>
                  <button
                    type="button"
                    class="location-picker__result"
                    (click)="selectStation(station.code)"
                  >
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
          <p class="location-picker__hint">Szukanie najbliższej stacji…</p>
        }
        @case ('error') {
          <p class="location-picker__hint" role="alert">{{ errorMessage() }}</p>
        }
        @case ('success') {
          @if (result(); as result) {
            <app-rain-verdict [report]="result.report" [distanceKm]="result.distanceKm" />
          }
        }
      }
    </div>
  `,
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent {
  private readonly geolocation = inject(GeolocationService);
  private readonly stations = inject(StationsService);
  private readonly rainReport = inject(RainReportService);

  protected readonly status = signal<LocationPickerStatus>('idle');
  protected readonly result = signal<LocationResult | null>(null);
  protected readonly errorKind = signal<LocationErrorKind | null>(null);
  protected readonly errorMessage = computed(() => {
    const kind = this.errorKind();
    return kind ? ERROR_MESSAGES[kind] : ERROR_MESSAGES['no-data'];
  });

  protected readonly searchQuery = signal('');
  protected readonly searchResults = resource({
    params: () => this.searchQuery(),
    loader: ({ params: query }) => firstValueFrom(this.stations.searchByName(query)),
  });

  useMyLocation(): void {
    this.status.set('loading');
    this.result.set(null);
    this.errorKind.set(null);

    this.geolocation
      .getCurrentPosition()
      .pipe(
        catchError((error: GeolocationError) => {
          this.errorKind.set(error.type === 'permission-denied' ? 'gps-denied' : 'gps-unavailable');
          return of(null);
        }),
        switchMap((coords) => {
          if (!coords) {
            return of(null);
          }

          return this.stations.findNearestStation(coords).pipe(
            catchError(() => {
              this.errorKind.set('network');
              return of(null);
            }),
          );
        }),
        switchMap((nearest) => {
          if (!nearest) {
            return of(null);
          }

          return this.rainReport.getRainReport(nearest.station.code).pipe(
            map((report) => (report ? { report, distanceKm: nearest.distanceKm } : null)),
            catchError(() => {
              this.errorKind.set('network');
              return of(null);
            }),
          );
        }),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'success' : 'error');
      });
  }

  selectStation(code: string): void {
    this.status.set('loading');
    this.result.set(null);
    this.errorKind.set(null);

    this.rainReport
      .getRainReport(code)
      .pipe(
        map((report) => (report ? { report, distanceKm: null } : null)),
        catchError(() => {
          this.errorKind.set('network');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'success' : 'error');
      });
  }
}
