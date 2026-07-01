import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RainReport } from '../../core/models/rain-report.model';
import { MmPipe } from '../../shared/pipes/mm.pipe';

@Component({
  selector: 'app-rain-verdict',
  imports: [MmPipe, DecimalPipe],
  template: `
    <div class="verdict" role="status">
      <p class="verdict__label" [class.verdict__label--rain]="report().didRain">
        {{ verdictText() }}
      </p>
      <p class="verdict__mm">{{ report().mm | mm }}</p>
      <p class="verdict__station">{{ report().stationName }}</p>
      @if (distanceKm(); as distanceKm) {
        <p class="verdict__distance">{{ distanceKm | number: '1.0-1' }} km od Ciebie</p>
      }
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
}
