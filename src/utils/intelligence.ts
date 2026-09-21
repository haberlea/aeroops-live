import type {
  DelayReason,
  DelayReasonDatum,
  Flight,
  ForecastDatum,
  Intelligence,
  RiskLevel,
  RiskResult,
  Weather,
} from '../types';
import { reasonForFlight } from '../data/enrich';

const SOFIA_TZ = 'Europe/Sofia';
const DONE = new Set(['Departed', 'Landed', 'Cancelled']);

const REASON_ORDER: DelayReason[] = [
  'Weather',
  'Late Aircraft',
  'Air Traffic Control',
  'Technical',
  'Ground Handling',
];

function sofiaHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: SOFIA_TZ }).format(date),
    10,
  );
}

function forecastLevel(load: number): RiskLevel {
  if (load < 40) return 'Low';
  if (load < 70) return 'Medium';
  return 'High';
}

/**
 * Aggregate the operational picture: at-risk count, average predicted delay,
 * most affected terminal, delay-reason breakdown, and a 5-hour congestion
 * forecast anchored to the operational window.
 */
export function buildIntelligence(
  flights: Flight[],
  riskById: Map<string, RiskResult>,
  simTime: Date,
  weather: Weather,
): Intelligence {
  const active = flights.filter((f) => !DONE.has(f.status));

  // At-risk flights + average predicted delay across them.
  const atRiskFlights = active.filter((f) => {
    const r = riskById.get(f.id);
    return r && r.level !== 'Low';
  });
  const atRisk = atRiskFlights.length;
  const avgPredictedDelay = atRisk
    ? Math.round(atRiskFlights.reduce((s, f) => s + (riskById.get(f.id)?.predictedDelay ?? 0), 0) / atRisk)
    : 0;

  // Most affected terminal by cumulative risk score.
  const terminalScore: Record<'T1' | 'T2', number> = { T1: 0, T2: 0 };
  for (const f of active) terminalScore[f.terminal] += riskById.get(f.id)?.score ?? 0;
  let mostAffectedTerminal: Intelligence['mostAffectedTerminal'] = '—';
  if (terminalScore.T1 > 0 || terminalScore.T2 > 0) {
    mostAffectedTerminal = terminalScore.T1 >= terminalScore.T2 ? 'T1' : 'T2';
  }

  // Delay-reason breakdown (predicted minutes + flight count).
  const buckets = new Map<DelayReason, { minutes: number; flights: number }>();
  for (const reason of REASON_ORDER) buckets.set(reason, { minutes: 0, flights: 0 });
  for (const f of active) {
    const r = riskById.get(f.id);
    if (!r) continue;
    if (f.delayMinutes > 0 || r.level !== 'Low') {
      const reason = f.delayReason ?? reasonForFlight(f.id);
      const b = buckets.get(reason)!;
      b.minutes += r.predictedDelay;
      b.flights += 1;
    }
  }
  const reasons: DelayReasonDatum[] = REASON_ORDER.map((reason) => ({
    reason,
    minutes: buckets.get(reason)!.minutes,
    flights: buckets.get(reason)!.flights,
  }));

  // 5-hour congestion forecast anchored to the operational window (06–14).
  const currentHour = sofiaHour(simTime);
  const opHour = Math.min(Math.max(currentHour, 6), 10);
  const perHour = new Map<number, number>();
  for (const f of flights) {
    if (f.status === 'Cancelled') continue;
    const hh = parseInt(f.scheduled.slice(0, 2), 10);
    perHour.set(hh, (perHour.get(hh) ?? 0) + 1);
  }
  const forecast: ForecastDatum[] = Array.from({ length: 5 }, (_, i) => {
    const h = opHour + i;
    const movements = perHour.get(h) ?? 0;
    const load = Math.min(100, Math.round(movements * 16 + weather.severity * 35));
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      load,
      level: forecastLevel(load),
      movements,
    };
  });

  return { atRisk, avgPredictedDelay, mostAffectedTerminal, reasons, forecast };
}
