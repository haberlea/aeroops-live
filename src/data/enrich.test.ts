import { describe, expect, it } from 'vitest';
import { enrichFlights, reasonForFlight } from './enrich';
import { flights as BASE_FLIGHTS } from './flights';

describe('reasonForFlight', () => {
  it('is deterministic for a given id', () => {
    expect(reasonForFlight('D-FB412')).toBe(reasonForFlight('D-FB412'));
  });

  it('returns one of the known delay reasons', () => {
    const known = ['Weather', 'Late Aircraft', 'Air Traffic Control', 'Technical', 'Ground Handling'];
    for (const f of BASE_FLIGHTS) expect(known).toContain(reasonForFlight(f.id));
  });
});

describe('enrichFlights', () => {
  it('enriches every authored flight', () => {
    expect(enrichFlights()).toHaveLength(BASE_FLIGHTS.length);
  });

  it('is stable across calls (deterministic enrichment)', () => {
    expect(enrichFlights()).toEqual(enrichFlights());
  });

  it('derives a plausible passenger load for every flight', () => {
    for (const f of enrichFlights()) {
      expect(f.passengers).toBeGreaterThan(0);
      expect(f.boarded).toBeGreaterThanOrEqual(0);
      expect(f.boarded).toBeLessThanOrEqual(f.passengers);
    }
  });

  it('only assigns a delay reason to flights that carry a delay', () => {
    for (const f of enrichFlights()) {
      if (f.delayMinutes > 0) expect(f.delayReason).not.toBeNull();
      else expect(f.delayReason).toBeNull();
    }
  });

  it('boards passengers in line with lifecycle phase', () => {
    for (const f of enrichFlights()) {
      if (f.status === 'Departed') expect(f.boarded).toBe(f.passengers);
      if (f.status === 'On Time') expect(f.boarded).toBe(0);
    }
  });

  it('preserves the authored board fields', () => {
    const enriched = enrichFlights();
    for (const base of BASE_FLIGHTS) {
      const found = enriched.find((f) => f.id === base.id)!;
      expect(found.flightNumber).toBe(base.flightNumber);
      expect(found.scheduled).toBe(base.scheduled);
      expect(found.terminal).toBe(base.terminal);
    }
  });
});
