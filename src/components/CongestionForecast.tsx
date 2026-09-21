import type { ForecastDatum, RiskLevel } from '../types';

const LEVEL_COLOR: Record<RiskLevel, string> = {
  Low: 'var(--color-green)',
  Medium: 'var(--color-amber)',
  High: 'var(--color-red)',
};

interface CongestionForecastProps {
  data: ForecastDatum[];
}

/**
 * Five-hour congestion forecast. Load is a state (Low/Medium/High), so bars use
 * the reserved status colors — always paired with the level label so meaning is
 * never carried by hue alone.
 */
export function CongestionForecast({ data }: CongestionForecastProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
        Congestion Forecast · Next 5h
      </h3>
      <p className="mt-0.5 mb-3 text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
        Projected apron & runway load
      </p>
      <div className="flex flex-col gap-2.5">
        {data.map((d) => {
          const color = LEVEL_COLOR[d.level];
          return (
            <div key={d.hour} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
              <span className="tabular text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
                {d.hour}
              </span>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--color-surface-3)' }}
                title={`${d.hour} — ${d.load}% load · ${d.movements} movements · ${d.level}`}
              >
                <div
                  className="bar-fill h-full rounded-full"
                  style={{ width: `${Math.max(d.load, 3)}%`, backgroundColor: color }}
                />
              </div>
              <span className="flex w-[86px] items-center justify-end gap-1.5">
                <span className="tabular text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {d.load}%
                </span>
                <span className="text-[10px] font-semibold uppercase" style={{ color }}>
                  {d.level}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
