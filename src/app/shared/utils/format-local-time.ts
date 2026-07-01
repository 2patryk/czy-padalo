const WARSAW_TIME_ZONE = 'Europe/Warsaw';

/** Formats a UTC ISO datetime string as `HH:mm` in Europe/Warsaw local time. */
export function formatLocalTime(utcIso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: WARSAW_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utcIso));
}
