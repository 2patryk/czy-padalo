import { Component, computed, input } from '@angular/core';
import { PrecipIconVariant } from '../utils/precip-icon-variant';

const LABELS: Record<PrecipIconVariant, string> = {
  'no-precip': 'brak opadów',
  light: 'lekki deszcz',
  heavy: 'ulewa',
  unknown: 'brak danych o opadach',
};

/** Purely decorative — the surrounding text already states the verdict, so the icon is `aria-hidden`. */
@Component({
  selector: 'app-precip-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      @switch (variant()) {
        @case ('no-precip') {
          <circle cx="12" cy="12" r="7" />
        }
        @case ('light') {
          <path d="M12 4C12 4 7 11 7 15a5 5 0 0 0 10 0c0-4-5-11-5-11Z" />
        }
        @case ('heavy') {
          <path d="M8 5C8 5 5 9.5 5 12.5a3 3 0 0 0 6 0C11 9.5 8 5 8 5Z" fill="currentColor" />
          <path
            d="M16 8C16 8 13 12.5 13 15.5a3 3 0 0 0 6 0C19 12.5 16 8 16 8Z"
            fill="currentColor"
          />
        }
        @case ('unknown') {
          <circle cx="12" cy="12" r="7" stroke-dasharray="2.5 2.5" />
        }
      }
    </svg>
  `,
  host: {
    '[attr.title]': 'label()',
  },
})
export class PrecipIconComponent {
  readonly variant = input.required<PrecipIconVariant>();

  protected readonly label = computed(() => LABELS[this.variant()]);
}
