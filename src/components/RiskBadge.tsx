import type { RiskLevel } from '../types';

const RISK_STYLE: Record<RiskLevel, { color: string; fill: string; glyph: string }> = {
  Low: { color: 'var(--color-green)', fill: 'rgba(46,194,126,0.14)', glyph: '▁' },
  Medium: { color: 'var(--color-amber)', fill: 'rgba(250,178,25,0.14)', glyph: '▄' },
  High: { color: 'var(--color-red)', fill: 'rgba(236,90,90,0.16)', glyph: '█' },
};

interface RiskBadgeProps {
  level: RiskLevel;
  /** Optional numeric score shown alongside (drawer / detail contexts). */
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const s = RISK_STYLE[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ color: s.color, borderColor: s.color, backgroundColor: s.fill }}
      title={score !== undefined ? `Risk score ${score}/100` : `Delay risk: ${level}`}
    >
      <span aria-hidden style={{ lineHeight: 1 }}>
        {s.glyph}
      </span>
      {level}
      {score !== undefined && <span className="tabular opacity-70">· {score}</span>}
    </span>
  );
}
