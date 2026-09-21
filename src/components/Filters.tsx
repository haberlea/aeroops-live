import type { FlightStatus } from '../types';

export interface FilterState {
  query: string;
  status: FlightStatus | 'all';
  terminal: 'all' | 'T1' | 'T2';
}

interface FiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Statuses actually present in the current tab, for a relevant dropdown. */
  availableStatuses: FlightStatus[];
  resultCount: number;
}

const selectStyle = {
  borderColor: 'var(--color-hairline-strong)',
  backgroundColor: 'var(--color-surface-2)',
  color: 'var(--color-ink)',
} as const;

export function Filters({ value, onChange, availableStatuses, resultCount }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1">
        <span
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style={{ color: 'var(--color-ink-muted)' }}
          aria-hidden
        >
          ⌕
        </span>
        <input
          type="search"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="Search flight no., airline, or city…"
          aria-label="Search flights"
          className="w-full rounded-lg border py-2.5 pr-3 pl-9 text-sm outline-none focus:ring-2"
          style={{ ...selectStyle }}
        />
      </div>

      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        <span className="font-semibold tracking-wide uppercase">Status</span>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as FilterState['status'] })}
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={selectStyle}
        >
          <option value="all">All statuses</option>
          {availableStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        <span className="font-semibold tracking-wide uppercase">Terminal</span>
        <select
          value={value.terminal}
          onChange={(e) => onChange({ ...value, terminal: e.target.value as FilterState['terminal'] })}
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={selectStyle}
        >
          <option value="all">All terminals</option>
          <option value="T1">Terminal 1</option>
          <option value="T2">Terminal 2</option>
        </select>
      </label>

      <span
        className="tabular ml-auto rounded-lg border px-3 py-2 text-xs font-medium"
        style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink-secondary)' }}
      >
        {resultCount} shown
      </span>
    </div>
  );
}
