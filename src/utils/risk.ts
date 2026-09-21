import type { Flight, RiskLevel, RiskResult, Weather } from '../types';

const DONE = new Set(['Departed', 'Landed', 'Cancelled']);

export interface RiskContext {
  weather: Weather;
  /** Congestion per terminal, 0–1. */
  congestion: Record<'T1' | 'T2', number>;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function levelFor(score: number): RiskLevel {
  if (score < 34) return 'Low';
  if (score <= 64) return 'Medium';
  return 'High';
}

/** Build the shared risk context (terminal congestion) from the live board. */
export function buildRiskContext(flights: Flight[], weather: Weather): RiskContext {
  let t1 = 0;
  let t2 = 0;
  for (const f of flights) {
    if (DONE.has(f.status)) continue;
    if (f.terminal === 'T1') t1++;
    else t2++;
  }
  return {
    weather,
    congestion: { T1: clamp01(t1 / 8), T2: clamp01(t2 / 14) },
  };
}

/**
 * Simulated delay risk for a flight, combining weather, terminal congestion,
 * aircraft turnaround pressure, and any delay already incurred. Completed
 * flights carry negligible risk.
 */
export function computeRisk(flight: Flight, ctx: RiskContext): RiskResult {
  const zero = { weather: 0, congestion: 0, turnaround: 0, delay: 0 };

  if (DONE.has(flight.status)) {
    return { score: 6, level: 'Low', components: zero, predictedDelay: flight.delayMinutes };
  }

  // Environmental terms (weather, congestion) form a modest per-terminal floor;
  // per-flight terms (turnaround, delay) drive most of the spread.
  const weather = ctx.weather.severity * 100;
  const congestion = ctx.congestion[flight.terminal] * 100;
  const turnaround = clamp01((flight.turnaroundMin - 28) / (58 - 28)) * 100;
  const delay = clamp01(flight.delayMinutes / 45) * 100;

  const score = Math.round(0.13 * weather + 0.15 * congestion + 0.32 * turnaround + 0.4 * delay);
  const level = levelFor(score);
  const predictedDelay = Math.round(flight.delayMinutes + (score / 100) * 22);

  return {
    score,
    level,
    components: {
      weather: Math.round(weather),
      congestion: Math.round(congestion),
      turnaround: Math.round(turnaround),
      delay: Math.round(delay),
    },
    predictedDelay,
  };
}

/** Compute risk for every flight, keyed by id. */
export function buildRiskMap(flights: Flight[], ctx: RiskContext): Map<string, RiskResult> {
  const map = new Map<string, RiskResult>();
  for (const f of flights) map.set(f.id, computeRisk(f, ctx));
  return map;
}
