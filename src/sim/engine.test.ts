import { describe, expect, it } from 'vitest';
import { addMinutes, simulateStep, weatherCondition } from './engine';
import { mulberry32 } from './rng';
import type { Weather } from '../types';
import { makeFlight } from '../test/factories';

describe('addMinutes', () => {
  it('adds minutes within the same hour', () => {
    expect(addMinutes('06:40', 20)).toBe('07:00');
  });

  it('wraps forwards over midnight', () => {
    expect(addMinutes('23:50', 20)).toBe('00:10');
  });

  it('wraps backwards past midnight', () => {
    expect(addMinutes('00:10', -20)).toBe('23:50');
  });

  it('is a no-op for zero', () => {
    expect(addMinutes('12:34', 0)).toBe('12:34');
  });

  it('pads hours and minutes to two digits', () => {
    expect(addMinutes('00:00', 65)).toBe('01:05');
  });
});

describe('weatherCondition', () => {
  it.each([
    [0.1, 'Clear · CAVOK'],
    [0.3, 'Scattered cloud · light wind'],
    [0.5, 'Low cloud · moderate wind'],
    [0.7, 'Rain showers · gusty'],
    [0.9, 'Low visibility · storm risk'],
  ])('maps severity %d to its band', (severity, expected) => {
    expect(weatherCondition(severity)).toBe(expected);
  });
});

describe('simulateStep', () => {
  const weather: Weather = { severity: 0.38, condition: weatherCondition(0.38) };

  it('is deterministic for the same seed and inputs', () => {
    const flights = [
      makeFlight({ id: 'D-1', status: 'On Time' }),
      makeFlight({ id: 'D-2', status: 'Boarding', boarded: 40 }),
      makeFlight({ id: 'A-1', direction: 'arrival', status: 'En Route' }),
    ];
    const first = simulateStep(flights, mulberry32(1), { ...weather });
    const second = simulateStep(flights, mulberry32(1), { ...weather });
    expect(second).toEqual(first);
  });

  it('does not mutate its input flights', () => {
    const flights = [makeFlight({ id: 'D-1', status: 'On Time', delayMinutes: 0 })];
    const snapshot = structuredClone(flights);
    simulateStep(flights, mulberry32(2), { ...weather });
    expect(flights).toEqual(snapshot);
  });

  it('keeps weather severity within its clamp band', () => {
    let w: Weather = { severity: 0.38, condition: weatherCondition(0.38) };
    const rng = mulberry32(7);
    const flights = [makeFlight({ id: 'D-1' })];
    for (let i = 0; i < 200; i++) {
      w = simulateStep(flights, rng, w).weather;
      expect(w.severity).toBeGreaterThanOrEqual(0.1);
      expect(w.severity).toBeLessThanOrEqual(0.85);
      expect(w.condition).toBe(weatherCondition(w.severity));
    }
  });

  it('never lets a delay exceed the 180-minute ceiling', () => {
    let flights = [makeFlight({ id: 'D-1', status: 'On Time', delayMinutes: 170 })];
    const rng = mulberry32(0xabc);
    for (let i = 0; i < 500; i++) {
      const result = simulateStep(flights, rng, { ...weather });
      flights = result.flights;
      for (const f of flights) expect(f.delayMinutes).toBeLessThanOrEqual(180);
    }
  });

  it('reports every changed flight id back to the caller', () => {
    const flights = [makeFlight({ id: 'D-1' }), makeFlight({ id: 'D-2' })];
    const rng = mulberry32(4);
    const { flights: after, changed } = simulateStep(flights, rng, { ...weather });
    for (let i = 0; i < flights.length; i++) {
      const differs = JSON.stringify(flights[i]) !== JSON.stringify(after[i]);
      if (differs) expect(changed).toContain(flights[i].id);
    }
  });

  it('assigns a delay reason when a flight becomes delayed', () => {
    // Drive many steps so the "introduce a delay" branch is exercised.
    let flights = [makeFlight({ id: 'D-1', status: 'On Time', delayMinutes: 0 })];
    const rng = mulberry32(1234);
    for (let i = 0; i < 100; i++) flights = simulateStep(flights, rng, { ...weather }).flights;
    for (const f of flights) {
      if (f.delayMinutes > 0) expect(f.delayReason).not.toBeNull();
    }
  });
});
