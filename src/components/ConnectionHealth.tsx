import type { ConnectionState } from '../types';

const STATE_STYLE: Record<ConnectionState, { color: string; label: string; spin: boolean }> = {
  Connected: { color: 'var(--color-green)', label: 'Connected', spin: false },
  Synchronizing: { color: 'var(--color-amber)', label: 'Synchronizing', spin: true },
  Offline: { color: 'var(--color-red)', label: 'Offline', spin: false },
};

interface ConnectionHealthProps {
  state: ConnectionState;
}

export function ConnectionHealth({ state }: ConnectionHealthProps) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.Connected;
  return (
    <div className="flex items-center gap-2" title={`Data link: ${s.label}`}>
      <span
        className={`h-2 w-2 rounded-full ${s.spin ? 'sync-blink' : ''}`}
        style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
      />
      <span className="text-xs font-medium" style={{ color: s.color }}>
        {s.label}
      </span>
    </div>
  );
}
