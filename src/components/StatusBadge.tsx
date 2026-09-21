import type { FlightStatus } from '../types';
import { STATUS_STYLE } from '../utils/status';

interface StatusBadgeProps {
  status: FlightStatus;
}

/** Pill badge that pairs a glyph + label with a status color (never color-alone). */
export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLE[status];
  const isLive = status === 'Boarding' || status === 'Gate Open' || status === 'En Route';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap"
      style={{ color: style.color, borderColor: style.color, backgroundColor: style.fill }}
    >
      <span aria-hidden className={isLive ? 'live-dot rounded-full' : ''} style={{ lineHeight: 1 }}>
        {style.glyph}
      </span>
      {status}
    </span>
  );
}
