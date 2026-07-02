import { isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, input, PLATFORM_ID, REQUEST } from '@angular/core';
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
    const request = inject(REQUEST, { optional: true });
    const platformId = inject(PLATFORM_ID);
    const origin = request
      ? new URL(request.url).origin
      : isPlatformBrowser(platformId)
        ? window.location.origin
        : '';

    effect(() => {
      const cityName = CITIES.find((c) => c.slug === this.citySlug())?.name ?? this.citySlug();
      const verdictText = this.report().didRain ? `Padało, ${this.report().mm} mm` : 'Nie padało';
      const description = `${verdictText} w ostatnich 24 godzinach w mieście ${cityName}. Sprawdź aktualny raport opadów dla najbliższej stacji pomiarowej.`;
      const imageUrl = `${origin}/api/og/${this.citySlug()}`;

      title.setTitle(`Czy padało w mieście ${cityName}? — ${verdictText}`);
      meta.updateTag({ name: 'description', content: description });
      meta.updateTag({ property: 'og:title', content: `Czy padało w mieście ${cityName}?` });
      meta.updateTag({ property: 'og:description', content: description });
      meta.updateTag({ property: 'og:image', content: imageUrl });
      meta.updateTag({ property: 'og:image:width', content: '1200' });
      meta.updateTag({ property: 'og:image:height', content: '630' });
      meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      meta.updateTag({ name: 'twitter:image', content: imageUrl });
    });
  }
}
