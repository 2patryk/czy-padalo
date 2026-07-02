import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RainReport } from '../../core/models/rain-report.model';
import { MmPipe } from '../../shared/pipes/mm.pipe';
import { PrecipIconComponent } from '../../shared/precip-icon/precip-icon.component';
import { toPrecipIconVariant } from '../../shared/utils/precip-icon-variant';

@Component({
  selector: 'app-rain-verdict',
  imports: [MmPipe, DecimalPipe, PrecipIconComponent],
  template: `
    <div class="verdict" role="status">
      <app-precip-icon class="verdict__icon" [variant]="iconVariant()" />
      <p class="verdict__label" [class.verdict__label--rain]="report().didRain">
        {{ verdictText() }}
      </p>
      <p class="verdict__mm">{{ report().mm | mm }}</p>
      <p class="verdict__station">{{ report().stationName }}</p>
      @if (distanceKm(); as distanceKm) {
        <p class="verdict__distance">{{ distanceKm | number: '1.0-1' }} km od Ciebie</p>
      }

      <dl class="verdict__breakdown">
        <div class="verdict__breakdown-row">
          <dt>Ostatnia godzina</dt>
          <dd>{{ report().lastHourMm | mm }}</dd>
        </div>
        <div class="verdict__breakdown-row">
          <dt>Ostatnie 6 godzin</dt>
          <dd>{{ report().sixHourMm | mm }}</dd>
        </div>
        <div class="verdict__breakdown-row">
          <dt>Ostatnie 12 godzin</dt>
          <dd>{{ report().twelveHourMm | mm }}</dd>
        </div>
        <div class="verdict__breakdown-row">
          <dt>Ostatnia doba</dt>
          <dd>{{ report().dailyMm | mm }}</dd>
        </div>
      </dl>
    </div>
  `,
  styleUrl: './rain-verdict.component.scss',
})
export class RainVerdictComponent {
  readonly report = input.required<RainReport>();
  readonly distanceKm = input<number | null>(null);

  protected readonly verdictText = computed(() =>
    this.report().didRain ? 'Padało' : 'Nie padało',
  );
  protected readonly iconVariant = computed(() =>
    toPrecipIconVariant(this.report().mm, this.report().hasData),
  );
}
