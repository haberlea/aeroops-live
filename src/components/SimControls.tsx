interface SimControlsProps {
  paused: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

export function SimControls({ paused, onToggle, onRefresh }: SimControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors"
        style={{
          borderColor: paused ? 'var(--color-green)' : 'var(--color-hairline-strong)',
          backgroundColor: paused ? 'rgba(46,194,126,0.14)' : 'var(--color-surface-2)',
          color: paused ? 'var(--color-green)' : 'var(--color-ink-secondary)',
        }}
        aria-pressed={paused}
      >
        <span aria-hidden>{paused ? '▶' : '⏸'}</span>
        {paused ? 'Resume' : 'Pause'}
      </button>

      <button
        onClick={onRefresh}
        className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors hover:brightness-125"
        style={{
          borderColor: 'var(--color-hairline-strong)',
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-cyan)',
        }}
        title="Fetch the latest board immediately"
      >
        <span aria-hidden>↻</span>
        Refresh now
      </button>
    </div>
  );
}
