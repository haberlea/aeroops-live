/** Formats a Date as "HH:MM:SS" in the given IANA time zone. */
export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

/** Formats a Date as "HH:MM" in the given IANA time zone. */
export function formatShort(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

/** Formats a full date + time stamp, e.g. "11 Sep 2026, 14:05:32". */
export function formatStamp(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}
