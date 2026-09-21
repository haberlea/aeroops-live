import type { ConnectionState } from '../types';
import { formatClock } from '../utils/time';
import { ConnectionHealth } from './ConnectionHealth';

const SOFIA_TZ = 'Europe/Sofia';

/** AeroOps logo mark — a stylized radar/aircraft glyph. */
function LogoMark() {
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-xl border"
      style={{
        borderColor: 'var(--color-hairline-strong)',
        background: 'linear-gradient(135deg, rgba(57,135,229,0.25), rgba(34,198,224,0.12))',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-4.5L21 16Z"
          fill="var(--color-cyan)"
        />
      </svg>
    </div>
  );
}

interface ClockBlockProps {
  label: string;
  time: string;
  accent?: string;
}

function ClockBlock({ label, time, accent }: ClockBlockProps) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <span className="tabular text-lg font-semibold" style={{ color: accent ?? 'var(--color-ink)' }}>
        {time}
      </span>
    </div>
  );
}

interface HeaderProps {
  now: Date;
  connection: ConnectionState;
  paused: boolean;
}

export function Header({ now, connection, paused }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'rgba(10,14,20,0.82)' }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">
                AeroOps <span style={{ color: 'var(--color-cyan)' }}>Live</span>
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
              Sofia International Airport · <span className="font-semibold">SOF</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
          <ClockBlock label="Local · Sofia" time={formatClock(now, SOFIA_TZ)} />
          <ClockBlock label="UTC" time={formatClock(now, 'UTC')} accent="var(--color-cyan)" />

          <div className="flex items-center gap-4 border-l pl-6" style={{ borderColor: 'var(--color-hairline)' }}>
            <ConnectionHealth state={connection} />

            {paused ? (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{ borderColor: 'var(--color-amber)', backgroundColor: 'rgba(250,178,25,0.12)' }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-amber)' }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-amber)' }}>
                  SIMULATION PAUSED
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{ borderColor: 'var(--color-green)', backgroundColor: 'rgba(46,194,126,0.12)' }}
              >
                <span className="live-dot h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-green)' }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-green)' }}>
                  LIVE OPERATIONS
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
