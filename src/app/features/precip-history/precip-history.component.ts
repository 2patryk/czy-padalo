import { Component, computed, inject, input, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ImgwApiService } from '../../core/services/imgw-api.service';
import { MmPipe } from '../../shared/pipes/mm.pipe';
import { formatLocalTime } from '../../shared/utils/format-local-time';

const HOURS = 24;

@Component({
  selector: 'app-precip-history',
  imports: [MmPipe],
  template: `
    <details class="precip-history">
      <summary class="precip-history__summary">Opady godzinowe (ostatnie 24h)</summary>

      @if (history.isLoading()) {
        <p class="precip-history__hint">Ładowanie historii…</p>
      } @else if (history.error()) {
        <p class="precip-history__hint" role="alert">Nie udało się pobrać historii opadów.</p>
      } @else if (history.value(); as value) {
        <ul class="precip-history__list">
          @for (entry of entriesNewestFirst(); track entry.date) {
            <li class="precip-history__row" [class.precip-history__row--rain]="entry.value > 0">
              <span class="precip-history__time">{{ formatLocalTime(entry.date) }}</span>
              <span class="precip-history__value">{{ entry.value | mm }}</span>
            </li>
          }
        </ul>
      }
    </details>
  `,
  styleUrl: './precip-history.component.scss',
})
export class PrecipHistoryComponent {
  private readonly imgwApi = inject(ImgwApiService);

  readonly stationCode = input.required<string>();

  protected readonly history = resource({
    params: () => this.stationCode(),
    loader: ({ params: code }) => firstValueFrom(this.imgwApi.getStationHistory(code, HOURS)),
  });

  protected readonly entriesNewestFirst = computed(() =>
    [...(this.history.value()?.precip ?? [])].reverse(),
  );

  protected readonly formatLocalTime = formatLocalTime;
}
