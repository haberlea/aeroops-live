import { describe, expect, it } from 'vitest';
import { buildIntelligence } from './intelligence';
import type { RiskResult, Weather } from '../types';
import { makeFlight } from '../test/factories';

const weather: Weather = { severity: 0.2, condition: 'Clear · CAVOK' };
// A Sofia hour of 08:00 (EEST, UTC+3 on this date) → forecast window 08–12.
const simTime = new Date('2026-09-21T05:00:00Z');

function risk(level: RiskResult['level'], score: number, predictedDelay: number): RiskResult {
  return {
    level,
    score,
    predictedDelay,
    components: { weather: 0, congestion: 0, turnaround: 0, delay: 0 },
  };
}

describe('buildIntelligence', () => {
  const flights = [
    makeFlight({ id: 'a', terminal: 'T1', status: 'On Time', delayMinutes: 0, scheduled: '08:00' }),
    makeFlight({ id: 'b', terminal: 'T2', status: 'Delayed', delayMinutes: 20, delayReason: 'Weather', scheduled: '09:00' }),
    makeFlight({ id: 'c', terminal: 'T1', status: 'Departed', delayMinutes: 15, scheduled: '07:00' }),
    makeFlight({ id: 'd', terminal: 'T2', status: 'Boarding', delayMinutes: 0, scheduled: '08:00' }),
  ];
  const riskById = new Map<string, RiskResult>([
    ['a', risk('Low', 10, 5)],
    ['b', risk('High', 80, 40)],
    ['c', risk('Low', 6, 15)],
    ['d', risk('Medium', 50, 15)],
  ]);

  const intel = buildIntelligence(flights, riskById, simTime, weather);

  it('counts only active non-Low flights as at risk', () => {
    expect(intel.atRisk).toBe(2); // b (High) + d (Medium); c is Departed, a is Low
  });

  it('averages the predicted delay across at-risk flights', () => {
    expect(intel.avgPredictedDelay).toBe(28); // round((40 + 15) / 2)
  });

  it('names the terminal with the greatest cumulative risk', () => {
    expect(intel.mostAffectedTerminal).toBe('T2'); // T2: 80+50 vs T1: 10
  });

  it('breaks delay minutes down by reason', () => {
    const total = intel.reasons.reduce((s, r) => s + r.minutes, 0);
    const totalFlights = intel.reasons.reduce((s, r) => s + r.flights, 0);
    expect(total).toBe(55); // 40 (b) + 15 (d)
    expect(totalFlights).toBe(2);
    const weatherBucket = intel.reasons.find((r) => r.reason === 'Weather')!;
    expect(weatherBucket.minutes).toBeGreaterThanOrEqual(40);
    expect(weatherBucket.flights).toBeGreaterThanOrEqual(1);
  });

  it('returns all five reason buckets in a fixed order', () => {
    expect(intel.reasons.map((r) => r.reason)).toEqual([
      'Weather',
      'Late Aircraft',
      'Air Traffic Control',
      'Technical',
      'Ground Handling',
    ]);
  });

  it('produces a 5-hour forecast anchored to the operational window', () => {
    expect(intel.forecast).toHaveLength(5);
    expect(intel.forecast.map((f) => f.hour)).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00']);
    const at8 = intel.forecast.find((f) => f.hour === '08:00')!;
    const at9 = intel.forecast.find((f) => f.hour === '09:00')!;
    expect(at8.movements).toBe(2); // a + d
    expect(at9.movements).toBe(1); // b
  });

  it('handles an empty board without dividing by zero', () => {
    const empty = buildIntelligence([], new Map(), simTime, weather);
    expect(empty.atRisk).toBe(0);
    expect(empty.avgPredictedDelay).toBe(0);
    expect(empty.mostAffectedTerminal).toBe('—');
    expect(empty.forecast).toHaveLength(5);
    expect(empty.reasons.every((r) => r.minutes === 0 && r.flights === 0)).toBe(true);
  });
});
