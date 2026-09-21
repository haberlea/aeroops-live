import type { DelayReasonDatum } from '../types';

interface DelayReasonsChartProps {
  data: DelayReasonDatum[];
}

/**
 * Horizontal bar chart of predicted delay minutes by cause. One measure across
 * five categories → a single hue (amber = delay), thin bars with 4px rounded
 * data-ends and direct value labels. Hover surfaces the flight count.
 */
export function DelayReasonsChart({ data }: DelayReasonsChartProps) {
  const max = Math.max(1, ...data.map((d) => d.minutes));

  return (
    <div>
      <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
        Delay Reasons
      </h3>
      <p className="mt-0.5 mb-3 text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
        Predicted minutes attributed by cause
      </p>
      <div className="flex flex-col gap-2.5">
        {data.map((d) => {
          const pct = (d.minutes / max) * 100;
          return (
            <div key={d.reason} className="grid grid-cols-[130px_1fr_auto] items-center gap-3">
              <span className="truncate text-xs" style={{ color: 'var(--color-ink-secondary)' }} title={d.reason}>
                {d.reason}
              </span>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--color-surface-3)' }}
                title={`${d.reason}: ${d.minutes} min across ${d.flights} flight${d.flights === 1 ? '' : 's'}`}
              >
                <div
                  className="bar-fill h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    minWidth: d.minutes > 0 ? '6px' : '0',
                    backgroundColor: 'var(--color-amber)',
                  }}
                />
              </div>
              <span
                className="tabular w-14 text-right text-xs font-semibold"
                style={{ color: 'var(--color-ink)' }}
              >
                {d.minutes}
                <span className="ml-0.5 font-normal" style={{ color: 'var(--color-ink-muted)' }}>
                  m
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
