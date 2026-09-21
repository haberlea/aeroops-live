import type { Flight, FlightStatus, Weather } from '../types';
import { reasonForFlight } from '../data/enrich';
import { chance, pick, randInt, type RNG } from './rng';

export interface StepResult {
  flights: Flight[];
  changed: string[];
  weather: Weather;
}

const DONE: FlightStatus[] = ['Departed', 'Landed', 'Cancelled'];

/** Next lifecycle phase for a flight, or null if it cannot advance. */
function nextStatus(f: Flight): FlightStatus | null {
  if (f.direction === 'departure') {
    switch (f.status) {
      case 'On Time':
      case 'Delayed':
        return 'Gate Open';
      case 'Gate Open':
        return 'Boarding';
      case 'Boarding':
        return 'Final Call';
      case 'Final Call':
        return 'Departed';
      default:
        return null;
    }
  }
  return f.status === 'En Route' ? 'Landed' : null;
}

/** Add (or subtract) minutes to a "HH:MM" clock string, wrapping at midnight. */
export function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  let total = (h * 60 + m + mins) % (24 * 60);
  if (total < 0) total += 24 * 60;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function weatherCondition(severity: number): string {
  if (severity < 0.25) return 'Clear · CAVOK';
  if (severity < 0.45) return 'Scattered cloud · light wind';
  if (severity < 0.65) return 'Low cloud · moderate wind';
  if (severity < 0.8) return 'Rain showers · gusty';
  return 'Low visibility · storm risk';
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Advance the simulation by one deterministic step. Pure: given the same
 * inputs and RNG state it always produces the same result.
 */
export function simulateStep(input: Flight[], rng: RNG, weather: Weather): StepResult {
  const changed = new Set<string>();
  const flights = input.map((f) => ({ ...f }));

  // Weather drifts slowly.
  let severity = weather.severity;
  if (chance(rng, 0.25)) {
    severity = clamp(severity + (rng() - 0.5) * 0.2, 0.1, 0.85);
  }
  const nextWeather: Weather = { severity, condition: weatherCondition(severity) };

  // 1. Progress lifecycle phases.
  for (const f of flights) {
    if (DONE.includes(f.status)) continue;
    if (chance(rng, 0.13)) {
      const next = nextStatus(f);
      if (next) {
        f.status = next;
        if (next === 'Boarding') f.boarded = Math.round(f.passengers * 0.2);
        else if (next === 'Final Call') f.boarded = Math.round(f.passengers * 0.9);
        else if (next === 'Departed') f.boarded = f.passengers;
        changed.add(f.id);
      }
    }
  }

  // 2. Boarding progress ticks up for boarding flights (no flash — ambient).
  for (const f of flights) {
    if (f.status === 'Boarding' && !changed.has(f.id)) {
      const inc = Math.round(f.passengers * (0.08 + rng() * 0.12));
      f.boarded = Math.min(f.passengers - 4, f.boarded + inc);
    }
  }

  // 3. Occasionally introduce or grow a delay on a suitable flight.
  if (chance(rng, 0.55)) {
    const candidates = flights.filter(
      (f) =>
        (f.direction === 'departure' && ['On Time', 'Delayed', 'Gate Open'].includes(f.status)) ||
        (f.direction === 'arrival' && f.status === 'En Route'),
    );
    if (candidates.length) {
      const f = pick(rng, candidates);
      f.delayMinutes = Math.min(180, f.delayMinutes + randInt(rng, 5, 25));
      if (f.status === 'On Time') f.status = 'Delayed';
      if (!f.delayReason) f.delayReason = reasonForFlight(f.id);
      f.estimated = addMinutes(f.scheduled, f.delayMinutes);
      changed.add(f.id);
    }
  }

  // 4. Occasionally recover some delay — the board should improve too.
  if (chance(rng, 0.22)) {
    const recoverable = flights.filter(
      (f) => f.delayMinutes > 0 && ['On Time', 'Delayed', 'Gate Open', 'Boarding'].includes(f.status),
    );
    if (recoverable.length) {
      const f = pick(rng, recoverable);
      f.delayMinutes = Math.max(0, f.delayMinutes - randInt(rng, 5, 15));
      if (f.delayMinutes === 0) {
        if (f.status === 'Delayed') f.status = 'On Time';
        f.delayReason = null;
        f.estimated = f.scheduled;
      } else {
        f.estimated = addMinutes(f.scheduled, f.delayMinutes);
      }
      changed.add(f.id);
    }
  }

  return { flights, changed: [...changed], weather: nextWeather };
}
