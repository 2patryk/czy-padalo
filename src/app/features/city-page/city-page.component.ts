import { Component, input } from '@angular/core';
import { RainReport } from '../../core/models/rain-report.model';
import { RainVerdictComponent } from '../rain-verdict/rain-verdict.component';

@Component({
  selector: 'app-city-page',
  imports: [RainVerdictComponent],
  template: ` <app-rain-verdict [report]="report()" /> `,
})
export class CityPageComponent {
  readonly report = input.required<RainReport>();
}
