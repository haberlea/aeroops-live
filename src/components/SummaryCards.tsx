import { useMemo } from 'react';
import type { Flight } from '../types';

interface SummaryCardsProps {
  flights: Flight[];
}

interface Card {
  label: string;
  value: string;
  sub: string;
  accent: string;
  glyph: string;
}

export function SummaryCards({ flights }: SummaryCardsProps) {
  const cards = useMemo<Card[]>(() => {
    const total = flights.length;
    const cancelled = flights.filter((f) => f.status === 'Cancelled').length;
    const delayed = flights.filter((f) => f.status !== 'Cancelled' && f.delayMinutes > 0).length;
    const onTime = flights.filter((f) => f.status !== 'Cancelled' && f.delayMinutes === 0).length;

    const delayedFlights = flights.filter((f) => f.delayMinutes > 0);
    const avgDelay = delayedFlights.length
      ? Math.round(delayedFlights.reduce((sum, f) => sum + f.delayMinutes, 0) / delayedFlights.length)
      : 0;

    const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}% of ops` : '—');

    return [
      { label: 'Total Flights', value: String(total), sub: 'Scheduled today', accent: 'var(--color-blue)', glyph: '✈' },
      { label: 'On Time', value: String(onTime), sub: pct(onTime), accent: 'var(--color-green)', glyph: '●' },
      { label: 'Delayed', value: String(delayed), sub: pct(delayed), accent: 'var(--color-amber)', glyph: '▲' },
      { label: 'Cancelled', value: String(cancelled), sub: pct(cancelled), accent: 'var(--color-red)', glyph: '✕' },
      {
        label: 'Avg Delay',
        value: `${avgDelay}`,
        sub: 'minutes · delayed flights',
        accent: 'var(--color-cyan)',
        glyph: '◷',
      },
    ];
  }, [flights]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-xl border p-4"
          style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface)' }}
        >
          <span className="absolute top-0 left-0 h-full w-1" style={{ backgroundColor: card.accent }} />
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              {card.label}
            </span>
            <span aria-hidden style={{ color: card.accent }}>
              {card.glyph}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="tabular text-3xl font-bold" style={{ color: card.accent }}>
              {card.value}
            </span>
            {card.label === 'Avg Delay' && (
              <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                min
              </span>
            )}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
