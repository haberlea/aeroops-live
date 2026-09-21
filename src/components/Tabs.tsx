import type { FlightDirection } from '../types';

interface TabsProps {
  active: FlightDirection;
  onChange: (dir: FlightDirection) => void;
  counts: Record<FlightDirection, number>;
}

const TABS: { id: FlightDirection; label: string; glyph: string }[] = [
  { id: 'departure', label: 'Departures', glyph: '↗' },
  { id: 'arrival', label: 'Arrivals', glyph: '↘' },
];

export function Tabs({ active, onChange, counts }: TabsProps) {
  return (
    <div
      className="inline-flex rounded-xl border p-1"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface)' }}
      role="tablist"
      aria-label="Flight direction"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--color-blue)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--color-ink-secondary)',
            }}
          >
            <span aria-hidden>{tab.glyph}</span>
            {tab.label}
            <span
              className="tabular rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'var(--color-surface-3)',
                color: isActive ? '#ffffff' : 'var(--color-ink-muted)',
              }}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
