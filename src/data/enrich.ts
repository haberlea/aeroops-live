import type { DelayReason, Flight } from '../types';
import { flights as BASE_FLIGHTS } from './flights';
import { hashString, mulberry32, pick, randInt, weightedPick, type RNG } from '../sim/rng';

/** Aircraft assigned by operating carrier for realism. */
const AIRCRAFT_BY_CARRIER: Record<string, string[]> = {
  EK: ['B777-300ER'],
  QR: ['A350-900'],
  LH: ['A320neo', 'A321neo'],
  TK: ['A321neo', 'B737 MAX 8'],
  BA: ['A320', 'A319'],
  AF: ['A220-300', 'A320'],
  KL: ['B737-800', 'E195-E2'],
  LX: ['A220-300', 'A320'],
  OS: ['A320', 'A321neo'],
  LO: ['E195', 'B737 MAX 8'],
  FB: ['A320', 'E190'],
  W6: ['A321neo', 'A320'],
  FR: ['B737-800', 'B737 MAX 8'],
  PC: ['A320neo', 'A321neo'],
  EW: ['A319', 'A320'],
  AZ: ['A320', 'A319'],
  A3: ['A320neo', 'A321neo'],
  LY: ['B737-800', 'B787-9'],
};

const CAPACITY: Record<string, number> = {
  A319: 144,
  A320: 174,
  A320neo: 180,
  A321neo: 220,
  'A220-300': 149,
  'B737-800': 189,
  'B737 MAX 8': 189,
  E190: 100,
  E195: 120,
  'E195-E2': 132,
  'B777-300ER': 354,
  'A350-900': 325,
  'B787-9': 282,
};

/** Registration prefix by carrier (nationality-accurate stems). */
const REG_PREFIX: Record<string, string> = {
  FB: 'LZ-F',
  W6: 'HA-L',
  FR: 'EI-D',
  LH: 'D-AI',
  TK: 'TC-J',
  OS: 'OE-L',
  A3: 'SX-D',
  QR: 'A7-A',
  AF: 'F-HZ',
  KL: 'PH-B',
  LO: 'SP-L',
  PC: 'TC-N',
  LX: 'HB-J',
  BA: 'G-EU',
  EW: 'D-AE',
  AZ: 'EI-D',
  EK: 'A6-E',
  LY: '4X-E',
};

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function makeRegistration(rng: RNG, code: string): string {
  const prefix = REG_PREFIX[code] ?? 'XX-A';
  const a = LETTERS[Math.floor(rng() * LETTERS.length)];
  const b = LETTERS[Math.floor(rng() * LETTERS.length)];
  return `${prefix}${a}${b}`;
}

const REASON_WEIGHTS: { value: DelayReason; weight: number }[] = [
  { value: 'Late Aircraft', weight: 32 },
  { value: 'Weather', weight: 24 },
  { value: 'Air Traffic Control', weight: 20 },
  { value: 'Ground Handling', weight: 14 },
  { value: 'Technical', weight: 10 },
];

/** Assign a plausible primary delay reason for a flight. */
export function reasonForFlight(id: string): DelayReason {
  return weightedPick(mulberry32(hashString(`${id}:reason`)), REASON_WEIGHTS);
}

function boardedFor(status: Flight['status'], passengers: number): number {
  switch (status) {
    case 'Boarding':
      return Math.round(passengers * 0.45);
    case 'Final Call':
      return Math.round(passengers * 0.9);
    case 'Departed':
      return passengers;
    default:
      return 0;
  }
}

/**
 * Enrich the authored board with deterministic operational detail. Each field
 * is derived from a per-flight seed, so values are stable across reloads.
 */
export function enrichFlights(): Flight[] {
  return BASE_FLIGHTS.map((f) => {
    const rng = mulberry32(hashString(f.id));
    const fleet = AIRCRAFT_BY_CARRIER[f.airlineCode] ?? ['A320'];
    const aircraftType = pick(rng, fleet);
    const capacity = CAPACITY[aircraftType] ?? 180;
    const loadFactor = 0.72 + rng() * 0.26; // 72–98%
    const passengers = Math.round(capacity * loadFactor);
    const registration = makeRegistration(rng, f.airlineCode);
    const turnaroundMin = randInt(rng, 28, 58);
    const delayReason = f.delayMinutes > 0 ? reasonForFlight(f.id) : null;

    return {
      ...f,
      aircraftType,
      registration,
      passengers,
      boarded: boardedFor(f.status, passengers),
      turnaroundMin,
      delayReason,
      opsNotifiedAt: null,
      gateReassigned: false,
    };
  });
}
