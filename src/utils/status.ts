import type { FlightStatus } from '../types';

export interface StatusStyle {
  /** Badge text + border color token (CSS var reference). */
  color: string;
  /** Translucent fill behind the badge. */
  fill: string;
  /** Short glyph shown alongside the label so meaning is never color-alone. */
  glyph: string;
}

/**
 * Status → visual style. Colors map to the restrained aviation palette
 * (blue, cyan, amber, red, green). Every badge also carries a glyph + label,
 * so status is never communicated by hue alone.
 */
export const STATUS_STYLE: Record<FlightStatus, StatusStyle> = {
  'On Time': { color: 'var(--color-green)', fill: 'rgba(46, 194, 126, 0.14)', glyph: '●' },
  'Gate Open': { color: 'var(--color-cyan)', fill: 'rgba(34, 198, 224, 0.14)', glyph: '⇢' },
  Boarding: { color: 'var(--color-blue)', fill: 'rgba(57, 135, 229, 0.16)', glyph: '↗' },
  'Final Call': { color: 'var(--color-amber)', fill: 'rgba(250, 178, 25, 0.16)', glyph: '⏱' },
  Departed: { color: 'var(--color-ink-secondary)', fill: 'rgba(174, 185, 199, 0.12)', glyph: '✔' },
  Delayed: { color: 'var(--color-amber)', fill: 'rgba(250, 178, 25, 0.14)', glyph: '▲' },
  Cancelled: { color: 'var(--color-red)', fill: 'rgba(236, 90, 90, 0.16)', glyph: '✕' },
  Landed: { color: 'var(--color-green)', fill: 'rgba(46, 194, 126, 0.14)', glyph: '⬇' },
  'En Route': { color: 'var(--color-cyan)', fill: 'rgba(34, 198, 224, 0.14)', glyph: '✈' },
};

export const ALL_STATUSES: FlightStatus[] = [
  'On Time',
  'Gate Open',
  'Boarding',
  'Final Call',
  'Departed',
  'Delayed',
  'Cancelled',
  'Landed',
  'En Route',
];
