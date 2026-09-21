import { describe, expect, it } from 'vitest';
import { buildRiskContext, buildRiskMap, computeRisk, type RiskContext } from './risk';
import type { Weather } from '../types';
import { makeFlight } from '../test/factories';

const calmWeather: Weather = { severity: 0.2, condition: 'Clear · CAVOK' };

const quietCtx: RiskContext = {
  weather: calmWeather,
  congestion: { T1: 0, T2: 0 },
};

describe('buildRiskContext', () => {
  it('ignores completed flights when measuring congestion', () => {
    const flights = [
      makeFlight({ id: '1', terminal: 'T1', status: 'On Time' }),
      makeFlight({ id: '2', terminal: 'T1', status: 'Departed' }),
      makeFlight({ id: '3', terminal: 'T2', status: 'En Route', direction: 'arrival' }),
    ];
    const ctx = buildRiskContext(flights, calmWeather);
    expect(ctx.congestion.T1).toBeCloseTo(1 / 8);
    expect(ctx.congestion.T2).toBeCloseTo(1 / 14);
  });

  it('clamps congestion to a maximum of 1', () => {
    const flights = Array.from({ length: 20 }, (_, i) =>
      makeFlight({ id: `t1-${i}`, terminal: 'T1', status: 'On Time' }),
    );
    const ctx = buildRiskContext(flights, calmWeather);
    expect(ctx.congestion.T1).toBe(1);
  });

  it('carries the weather through unchanged', () => {
    const ctx = buildRiskContext([], calmWeather);
    expect(ctx.weather).toBe(calmWeather);
  });
});

describe('computeRisk', () => {
  it('treats completed flights as negligible risk', () => {
    const flight = makeFlight({ status: 'Departed', delayMinutes: 25 });
    const result = computeRisk(flight, quietCtx);
    expect(result.level).toBe('Low');
    expect(result.score).toBe(6);
    expect(result.predictedDelay).toBe(25);
    expect(result.components).toEqual({ weather: 0, congestion: 0, turnaround: 0, delay: 0 });
  });

  it('rates a calm, on-time, quick-turnaround flight as Low', () => {
    const flight = makeFlight({ status: 'On Time', delayMinutes: 0, turnaroundMin: 28 });
    expect(computeRisk(flight, quietCtx).level).toBe('Low');
  });

  it('rates a heavily delayed, tight-turnaround flight as High', () => {
    const flight = makeFlight({ status: 'Delayed', delayMinutes: 60, turnaroundMin: 58 });
    const result = computeRisk(flight, {
      weather: { severity: 0.7, condition: 'Rain showers · gusty' },
      congestion: { T1: 0.9, T2: 0.9 },
    });
    expect(result.level).toBe('High');
    expect(result.score).toBeGreaterThan(64);
  });

  it('predicts a delay at least as large as the incurred delay', () => {
    const flight = makeFlight({ status: 'Delayed', delayMinutes: 30 });
    const result = computeRisk(flight, quietCtx);
    expect(result.predictedDelay).toBeGreaterThanOrEqual(30);
  });

  it('caps each delay component at 100', () => {
    const flight = makeFlight({ status: 'Delayed', delayMinutes: 500, turnaroundMin: 200 });
    const result = computeRisk(flight, {
      weather: { severity: 1, condition: 'x' },
      congestion: { T1: 1, T2: 1 },
    });
    expect(result.components.delay).toBe(100);
    expect(result.components.turnaround).toBe(100);
    expect(result.components.weather).toBe(100);
    expect(result.components.congestion).toBe(100);
  });
});

describe('buildRiskMap', () => {
  it('produces one entry per flight, keyed by id', () => {
    const flights = [makeFlight({ id: 'a' }), makeFlight({ id: 'b' }), makeFlight({ id: 'c' })];
    const map = buildRiskMap(flights, quietCtx);
    expect(map.size).toBe(3);
    expect([...map.keys()].sort()).toEqual(['a', 'b', 'c']);
  });
});
