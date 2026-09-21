import type { Flight, FlightDirection, RiskResult } from '../types';
import { StatusBadge } from './StatusBadge';
import { RiskBadge } from './RiskBadge';

interface FlightTableProps {
  flights: Flight[];
  direction: FlightDirection;
  riskById: Map<string, RiskResult>;
  /** id → timestamp of last change; drives the brief row highlight. */
  updatedIds: Record<string, number>;
  onSelect: (flight: Flight) => void;
}

const TERMINAL_STATES = new Set(['Departed', 'Landed', 'Cancelled']);

function DelayCell({ flight }: { flight: Flight }) {
  if (flight.status === 'Cancelled') {
    return <span style={{ color: 'var(--color-ink-muted)' }}>—</span>;
  }
  if (flight.delayMinutes > 0) {
    return (
      <span className="tabular font-semibold" style={{ color: 'var(--color-amber)' }}>
        +{flight.delayMinutes}m
      </span>
    );
  }
  return (
    <span className="tabular" style={{ color: 'var(--color-green)' }}>
      On schedule
    </span>
  );
}

const HEAD_CLASS = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap';

export function FlightTable({ flights, direction, riskById, updatedIds, onSelect }: FlightTableProps) {
  const cityHeader = direction === 'departure' ? 'Destination' : 'Origin';

  if (flights.length === 0) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="text-3xl" aria-hidden>
          ⌕
        </div>
        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
          No flights match your filters.
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          Try clearing the search or selecting a different status / terminal.
        </p>
      </div>
    );
  }

  return (
    <div
      className="scroll-thin overflow-x-auto rounded-xl border"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface)' }}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-muted)' }}>
            <th className={HEAD_CLASS}>Flight</th>
            <th className={HEAD_CLASS}>Airline</th>
            <th className={HEAD_CLASS}>{cityHeader}</th>
            <th className={HEAD_CLASS}>Sched</th>
            <th className={HEAD_CLASS}>Est</th>
            <th className={HEAD_CLASS}>Term</th>
            <th className={HEAD_CLASS}>Gate</th>
            <th className={HEAD_CLASS}>Status</th>
            <th className={HEAD_CLASS}>Risk</th>
            <th className={HEAD_CLASS}>Delay</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((f, i) => {
            const cancelled = f.status === 'Cancelled';
            const risk = riskById.get(f.id);
            const flashed = updatedIds[f.id];
            return (
              <tr
                key={`${f.id}:${flashed ?? 0}`}
                className={`cursor-pointer border-t transition-colors hover:brightness-125 ${flashed ? 'row-flash' : ''}`}
                style={{
                  borderColor: 'var(--color-hairline)',
                  backgroundColor: i % 2 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  opacity: cancelled ? 0.7 : 1,
                }}
                onClick={() => onSelect(f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(f);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${f.flightNumber} to ${f.city}, ${f.status}. Open details`}
              >
                <td className="tabular px-4 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--color-ink)' }}>
                  {f.flightNumber}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-ink-secondary)' }}>
                  <span
                    className="mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-cyan)' }}
                  >
                    {f.airlineCode}
                  </span>
                  {f.airline}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {f.city}
                  </span>
                  <span className="tabular ml-1.5 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                    {f.cityCode}
                  </span>
                </td>
                <td className="tabular px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-ink-secondary)' }}>
                  {f.scheduled}
                </td>
                <td
                  className="tabular px-4 py-3 font-semibold whitespace-nowrap"
                  style={{ color: f.delayMinutes > 0 ? 'var(--color-amber)' : 'var(--color-ink)' }}
                >
                  {f.estimated ?? '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-ink-secondary)' }}
                  >
                    {f.terminal}
                  </span>
                </td>
                <td className="tabular px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--color-ink)' }}>
                  {cancelled ? '—' : f.gate}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={f.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {risk && !TERMINAL_STATES.has(f.status) ? (
                    <RiskBadge level={risk.level} />
                  ) : (
                    <span style={{ color: 'var(--color-ink-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <DelayCell flight={f} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
