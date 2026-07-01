import { formatLocalTime } from './format-local-time';

describe('formatLocalTime', () => {
  it('converts a winter UTC timestamp to CET (UTC+1)', () => {
    expect(formatLocalTime('2026-01-15T12:00:00Z')).toBe('13:00');
  });

  it('converts a summer UTC timestamp to CEST (UTC+2, DST)', () => {
    expect(formatLocalTime('2026-07-01T12:00:00Z')).toBe('14:00');
  });

  it('handles a UTC timestamp that rolls over to the next local hour', () => {
    expect(formatLocalTime('2026-07-01T22:30:00Z')).toBe('00:30');
  });
});
