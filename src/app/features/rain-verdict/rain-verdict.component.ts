import { Component, computed, input } from '@angular/core';
import { RainReport } from '../../core/models/rain-report.model';
import { MmPipe } from '../../shared/pipes/mm.pipe';

@Component({
  selector: 'app-rain-verdict',
  imports: [MmPipe],
  template: `
    <div class="verdict" role="status">
      <p class="verdict__label" [class.verdict__label--rain]="report().didRain">
        {{ verdictText() }}
      </p>
      <p class="verdict__mm">{{ report().mm | mm }}</p>
      <p class="verdict__station">{{ report().stationName }}</p>
    </div>
  `,
  styleUrl: './rain-verdict.component.scss',
})
export class RainVerdictComponent {
  readonly report = input.required<RainReport>();

  protected readonly verdictText = computed(() =>
    this.report().didRain ? 'Padało' : 'Nie padało',
  );
}
