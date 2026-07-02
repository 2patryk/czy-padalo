import { Component, effect, inject, input } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CITIES } from '../../core/data/cities';
import { RainReport } from '../../core/models/rain-report.model';
import { PrecipHistoryComponent } from '../precip-history/precip-history.component';
import { RainVerdictComponent } from '../rain-verdict/rain-verdict.component';

@Component({
  selector: 'app-city-page',
  imports: [RainVerdictComponent, PrecipHistoryComponent],
  template: `
    <app-rain-verdict [report]="report()" />
    <app-precip-history [stationCode]="report().stationCode" />
  `,
})
export class CityPageComponent {
  readonly report = input.required<RainReport>();
  readonly citySlug = input.required<string>();

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);

    effect(() => {
      const cityName = CITIES.find((c) => c.slug === this.citySlug())?.name ?? this.citySlug();
      const verdictText = this.report().didRain ? `Padało, ${this.report().mm} mm` : 'Nie padało';

      title.setTitle(`Czy pada w mieście ${cityName}? — ${verdictText}`);
      meta.updateTag({
        name: 'description',
        content: `${verdictText} w ostatnich 24 godzinach w mieście ${cityName}. Sprawdź aktualny raport opadów dla najbliższej stacji pomiarowej.`,
      });
    });
  }
}
