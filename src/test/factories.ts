import type { Flight } from '../types';

/**
 * Build a fully-formed Flight for tests. Defaults describe a calm, on-time
 * departure; override only the fields a given case cares about.
 */
export function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'D-TEST1',
    direction: 'departure',
    flightNumber: 'TT 100',
    airline: 'Test Air',
    airlineCode: 'TT',
    city: 'London',
    cityCode: 'LHR',
    scheduled: '08:00',
    estimated: '08:00',
    terminal: 'T2',
    gate: 'B4',
    status: 'On Time',
    delayMinutes: 0,
    aircraftType: 'A320',
    registration: 'LZ-FAA',
    passengers: 160,
    boarded: 0,
    turnaroundMin: 40,
    delayReason: null,
    opsNotifiedAt: null,
    gateReassigned: false,
    ...overrides,
  };
}
