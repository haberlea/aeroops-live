import type { Intelligence, Weather } from '../types';
import { DelayReasonsChart } from './DelayReasonsChart';
import { CongestionForecast } from './CongestionForecast';

interface DelayIntelligenceProps {
  intelligence: Intelligence;
  weather: Weather;
}

interface MiniStat {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  accent: string;
  glyph: string;
}

export function DelayIntelligence({ intelligence, weather }: DelayIntelligenceProps) {
  const stats: MiniStat[] = [
    {
      label: 'Flights at Risk',
      value: String(intelligence.atRisk),
      sub: 'Medium or high risk',
      accent: 'var(--color-amber)',
      glyph: '⚠',
    },
    {
      label: 'Avg Predicted Delay',
      value: String(intelligence.avgPredictedDelay),
      unit: 'min',
      sub: 'Across at-risk flights',
      accent: 'var(--color-red)',
      glyph: '◷',
    },
    {
      label: 'Most Affected',
      value: intelligence.mostAffectedTerminal,
      sub: 'Highest cumulative risk',
      accent: 'var(--color-cyan)',
      glyph: '⌂',
    },
  ];

  return (
    <section
      className="rounded-xl border"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface)' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ color: 'var(--color-cyan)' }}>
            ◈
          </span>
          <h2 className="text-sm font-bold tracking-wide">Delay Intelligence</h2>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--color-hairline-strong)', color: 'var(--color-ink-secondary)' }}
          title={`Weather severity ${Math.round(weather.severity * 100)}%`}
        >
          <span aria-hidden>☁</span>
          <span className="font-medium">{weather.condition}</span>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,320px)_1fr_1fr]">
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--color-ink-muted)' }}
                >
                  {s.label}
                </span>
                <span aria-hidden style={{ color: s.accent }}>
                  {s.glyph}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="tabular text-2xl font-bold" style={{ color: s.accent }}>
                  {s.value}
                </span>
                {s.unit && (
                  <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                    {s.unit}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: 'var(--color-ink-secondary)' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5" style={{ borderColor: 'var(--color-hairline)' }}>
          <DelayReasonsChart data={intelligence.reasons} />
        </div>

        <div className="border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5" style={{ borderColor: 'var(--color-hairline)' }}>
          <CongestionForecast data={intelligence.forecast} />
        </div>
      </div>
    </section>
  );
}
