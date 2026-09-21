import { useEffect, useState } from 'react';
import type { DelayReason, Flight, FlightStatus, RiskResult } from '../types';
import { addMinutes } from '../sim/engine';
import { formatShort } from '../utils/time';
import { StatusBadge } from './StatusBadge';
import { RiskBadge } from './RiskBadge';
import { ConfirmDialog } from './ConfirmDialog';

const T1_GATES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
const T2_GATES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'C1', 'C2', 'C3', 'C4', 'C5'];

const DEP_STAGE_INDEX: Record<FlightStatus, number> = {
  'On Time': 0,
  Delayed: 0,
  'Gate Open': 1,
  Boarding: 2,
  'Final Call': 3,
  Departed: 4,
  Cancelled: -1,
  Landed: 4,
  'En Route': 0,
};

const ARR_STAGE_INDEX: Record<FlightStatus, number> = {
  'On Time': 0,
  Delayed: 0,
  'En Route': 1,
  Landed: 2,
  Cancelled: -1,
  'Gate Open': 0,
  Boarding: 0,
  'Final Call': 0,
  Departed: 2,
};

const RECOMMENDATION: Record<DelayReason, string> = {
  Weather: 'Monitor METAR updates and hold boarding until visibility improves. Coordinate a revised slot with ATC.',
  'Late Aircraft': 'Inbound aircraft is running late. Expedite turnaround — prioritise cleaning and catering to recover the schedule.',
  'Air Traffic Control': 'Await a revised CTOT from the network manager. Keep passengers gate-side for rapid boarding once cleared.',
  Technical: 'Engineering assessment in progress. Prepare a standby aircraft and notify downline stations of possible knock-on delay.',
  'Ground Handling': 'Escalate to the ramp supervisor and add baggage crew to reduce turnaround time.',
};

interface Stage {
  label: string;
  time: string;
  state: 'done' | 'current' | 'pending';
}

function buildTimeline(f: Flight): Stage[] {
  const isDep = f.direction === 'departure';
  const complete = f.status === 'Departed' || f.status === 'Landed';
  const currentIdx = (isDep ? DEP_STAGE_INDEX : ARR_STAGE_INDEX)[f.status];
  const anchor = f.estimated ?? f.scheduled;

  const raw: { label: string; time: string }[] = isDep
    ? [
        { label: 'Scheduled', time: f.scheduled },
        { label: 'Gate Open', time: addMinutes(anchor, -45) },
        { label: 'Boarding', time: addMinutes(anchor, -35) },
        { label: 'Final Call', time: addMinutes(anchor, -12) },
        { label: 'Departed', time: anchor },
      ]
    : [
        { label: 'Scheduled', time: f.scheduled },
        { label: 'En Route', time: addMinutes(anchor, -40) },
        { label: 'Landed', time: anchor },
      ];

  return raw.map((s, i) => ({
    ...s,
    state: complete ? 'done' : i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending',
  }));
}

function proposedGate(f: Flight): string {
  const pool = f.terminal === 'T1' ? T1_GATES : T2_GATES;
  const idx = pool.indexOf(f.gate);
  const base = idx < 0 ? 0 : idx;
  return pool[(base + 3) % pool.length];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }}
    >
      <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </div>
      <div className="tabular mt-1 text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: 'var(--color-ink-secondary)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const RISK_BAR: { key: keyof RiskResult['components']; label: string }[] = [
  { key: 'weather', label: 'Weather' },
  { key: 'congestion', label: 'Terminal congestion' },
  { key: 'turnaround', label: 'Turnaround pressure' },
  { key: 'delay', label: 'Existing delay' },
];

interface FlightDrawerProps {
  flight: Flight;
  risk: RiskResult;
  now: Date;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Flight>) => void;
}

export function FlightDrawer({ flight, risk, now, onClose, onUpdate }: FlightDrawerProps) {
  const [dialog, setDialog] = useState<'notify' | 'gate' | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialog) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, onClose]);

  const isDep = flight.direction === 'departure';
  const timeline = buildTimeline(flight);
  const boardingPct = flight.passengers ? Math.round((flight.boarded / flight.passengers) * 100) : 0;
  const reason = flight.delayReason;
  const recommendation = reason
    ? RECOMMENDATION[reason]
    : 'No delay attributed. Flight is operating to schedule — no action required.';
  const newGate = proposedGate(flight);

  const confirmNotify = () => {
    onUpdate(flight.id, { opsNotifiedAt: formatShort(now, 'Europe/Sofia') });
    setDialog(null);
  };
  const confirmGate = () => {
    onUpdate(flight.id, { gate: newGate, gateReassigned: true });
    setDialog(null);
  };

  return (
    <div className="overlay-in fixed inset-0 z-40 flex justify-end" style={{ backgroundColor: 'rgba(4,7,11,0.6)' }} onClick={onClose}>
      <aside
        className="drawer-panel scroll-thin flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l"
        style={{ borderColor: 'var(--color-hairline-strong)', backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${flight.flightNumber} details`}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b px-5 py-4 backdrop-blur"
          style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'rgba(17,23,33,0.92)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="tabular text-xl font-bold">{flight.flightNumber}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-cyan)' }}
                >
                  {flight.airlineCode}
                </span>
              </div>
              <div className="mt-0.5 text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                {flight.airline}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {isDep ? 'SOF' : flight.cityCode} <span style={{ color: 'var(--color-ink-muted)' }}>→</span>{' '}
                {isDep ? flight.cityCode : 'SOF'}
                <span className="ml-2 font-normal" style={{ color: 'var(--color-ink-muted)' }}>
                  {flight.city}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border text-lg leading-none transition-colors hover:brightness-125"
              style={{ borderColor: 'var(--color-hairline-strong)', color: 'var(--color-ink-secondary)' }}
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={flight.status} />
            <RiskBadge level={risk.level} score={risk.score} />
            {flight.delayMinutes > 0 && (
              <span className="tabular text-xs font-semibold" style={{ color: 'var(--color-amber)' }}>
                +{flight.delayMinutes} min
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Timeline */}
          <Section title="Flight Timeline">
            <ol className="relative flex flex-col gap-0">
              {timeline.map((s, i) => {
                const color =
                  s.state === 'done'
                    ? 'var(--color-green)'
                    : s.state === 'current'
                      ? 'var(--color-cyan)'
                      : 'var(--color-ink-muted)';
                return (
                  <li key={s.label} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${s.state === 'current' ? 'live-dot' : ''}`}
                        style={{
                          borderColor: color,
                          color,
                          backgroundColor: s.state === 'done' ? 'rgba(46,194,126,0.16)' : 'transparent',
                        }}
                      >
                        {s.state === 'done' ? '✓' : s.state === 'current' ? '●' : ''}
                      </span>
                      {i < timeline.length - 1 && (
                        <span className="w-px flex-1" style={{ backgroundColor: 'var(--color-hairline-strong)', minHeight: 18 }} />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between pb-4">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: s.state === 'pending' ? 'var(--color-ink-muted)' : 'var(--color-ink)' }}
                      >
                        {s.label}
                      </span>
                      <span className="tabular text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                        {flight.status === 'Cancelled' ? '—' : s.time}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          {/* Aircraft + gate */}
          <Section title="Aircraft & Stand">
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Aircraft" value={flight.aircraftType} sub={`${flight.passengers} seats booked`} />
              <InfoTile label="Registration" value={flight.registration} sub={`Turnaround ${flight.turnaroundMin} min`} />
              <InfoTile label="Terminal" value={flight.terminal} />
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }}
              >
                <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ink-muted)' }}>
                  Gate
                </div>
                <div className="tabular mt-1 flex items-center gap-2 text-lg font-bold">
                  {flight.status === 'Cancelled' ? '—' : flight.gate}
                  {flight.gateReassigned && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide"
                      style={{ backgroundColor: 'rgba(34,198,224,0.16)', color: 'var(--color-cyan)' }}
                    >
                      REASSIGNED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Boarding progress */}
          <Section title={isDep ? 'Boarding Progress' : 'Inbound Status'}>
            {isDep ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink-secondary)' }}>
                    <span className="tabular font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {flight.boarded}
                    </span>{' '}
                    / {flight.passengers} boarded
                  </span>
                  <span className="tabular font-bold" style={{ color: 'var(--color-cyan)' }}>
                    {boardingPct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-3)' }}>
                  <div
                    className="bar-fill h-full rounded-full"
                    style={{ width: `${boardingPct}%`, backgroundColor: 'var(--color-cyan)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                {flight.status === 'Landed'
                  ? 'Aircraft on stand — disembarkation in progress.'
                  : flight.status === 'En Route'
                    ? 'Aircraft airborne and on approach to SOF.'
                    : 'Awaiting departure from origin station.'}
              </div>
            )}
          </Section>

          {/* Delay reason + recommendation */}
          <Section title="Delay Reason & Recommendation">
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: reason ? 'rgba(250,178,25,0.14)' : 'rgba(46,194,126,0.14)',
                    color: reason ? 'var(--color-amber)' : 'var(--color-green)',
                  }}
                >
                  {reason ?? 'No delay'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
                {recommendation}
              </p>
            </div>
          </Section>

          {/* Risk breakdown */}
          <Section title="Risk Breakdown">
            <div className="flex flex-col gap-2.5">
              {RISK_BAR.map((bar) => {
                const v = risk.components[bar.key];
                return (
                  <div key={bar.key} className="grid grid-cols-[150px_1fr_auto] items-center gap-3">
                    <span className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                      {bar.label}
                    </span>
                    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-3)' }}>
                      <div
                        className="bar-fill h-full rounded-full"
                        style={{ width: `${v}%`, backgroundColor: 'var(--color-blue)' }}
                      />
                    </div>
                    <span className="tabular w-8 text-right text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-hairline)' }}>
              <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                Predicted total delay
              </span>
              <span className="tabular text-sm font-bold" style={{ color: 'var(--color-amber)' }}>
                {risk.predictedDelay} min
              </span>
            </div>
          </Section>

          {flight.opsNotifiedAt && (
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--color-green)', backgroundColor: 'rgba(46,194,126,0.1)', color: 'var(--color-green)' }}
            >
              <span aria-hidden>✓</span>
              Operations notified at <span className="tabular font-semibold">{flight.opsNotifiedAt}</span>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div
          className="sticky bottom-0 mt-auto flex gap-2 border-t px-5 py-4 backdrop-blur"
          style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'rgba(17,23,33,0.92)' }}
        >
          <button
            onClick={() => setDialog('notify')}
            disabled={!!flight.opsNotifiedAt}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-blue)' }}
          >
            {flight.opsNotifiedAt ? 'Operations Notified' : 'Notify Operations'}
          </button>
          <button
            onClick={() => setDialog('gate')}
            disabled={flight.status === 'Cancelled'}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' }}
          >
            Assign New Gate
          </button>
        </div>
      </aside>

      {dialog === 'notify' && (
        <ConfirmDialog
          title="Notify Operations Center"
          confirmLabel="Send Notification"
          onConfirm={confirmNotify}
          onCancel={() => setDialog(null)}
          message={
            <>
              Escalate <strong>{flight.flightNumber}</strong> ({flight.airline}) to the Operations Control Center for
              priority handling? Duty managers will be alerted with the current risk assessment.
            </>
          }
        />
      )}
      {dialog === 'gate' && (
        <ConfirmDialog
          title="Reassign Gate"
          confirmLabel={`Move to ${newGate}`}
          onConfirm={confirmGate}
          onCancel={() => setDialog(null)}
          message={
            <>
              Reassign <strong>{flight.flightNumber}</strong> from gate <strong>{flight.gate}</strong> to{' '}
              <strong>{newGate}</strong> in {flight.terminal}? Ground handling and passengers will be updated.
            </>
          }
        />
      )}
    </div>
  );
}
