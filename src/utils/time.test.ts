import { describe, expect, it } from 'vitest';
import { formatClock, formatShort, formatStamp } from './time';

// 05:00 UTC on 2026-09-21 is 08:00 in Sofia (EEST, UTC+3).
const date = new Date('2026-09-21T05:00:32Z');
const TZ = 'Europe/Sofia';

describe('time formatting', () => {
  it('formatShort renders HH:MM in the given zone', () => {
    expect(formatShort(date, TZ)).toBe('08:00');
  });

  it('formatClock renders HH:MM:SS in the given zone', () => {
    expect(formatClock(date, TZ)).toBe('08:00:32');
  });

  it('formatStamp renders a full date + time', () => {
    // Month abbreviation ("Sep"/"Sept") varies by ICU version, so match loosely.
    expect(formatStamp(date, TZ)).toMatch(/^21 Sept? 2026, 08:00:32$/);
  });

  it('respects the requested time zone', () => {
    expect(formatShort(date, 'UTC')).toBe('05:00');
  });
});
