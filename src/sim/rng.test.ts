import { describe, expect, it } from 'vitest';
import { chance, hashString, mulberry32, pick, randInt, weightedPick } from './rng';

describe('mulberry32', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = mulberry32(0x5eed1234);
    const b = mulberry32(0x5eed1234);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('emits values in the [0, 1) range', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('D-FB412')).toBe(hashString('D-FB412'));
  });

  it('differs for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('randInt', () => {
  it('stays within the inclusive bounds', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const n = randInt(rng, 5, 25);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(25);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('can return both endpoints of a small range', () => {
    const rng = mulberry32(99);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(randInt(rng, 0, 1));
    expect(seen).toEqual(new Set([0, 1]));
  });
});

describe('pick', () => {
  it('always returns a member of the collection', () => {
    const rng = mulberry32(3);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(pick(rng, items));
  });
});

describe('weightedPick', () => {
  it('always returns the only weighted option', () => {
    const rng = mulberry32(11);
    const items = [
      { value: 'never', weight: 0 },
      { value: 'always', weight: 5 },
    ];
    for (let i = 0; i < 100; i++) expect(weightedPick(rng, items)).toBe('always');
  });

  it('honours weight distribution roughly', () => {
    const rng = mulberry32(123);
    const items = [
      { value: 'heavy', weight: 9 },
      { value: 'light', weight: 1 },
    ];
    let heavy = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) if (weightedPick(rng, items) === 'heavy') heavy++;
    expect(heavy / runs).toBeGreaterThan(0.8);
  });
});

describe('chance', () => {
  it('is never true at p=0 and always true at p=1', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      expect(chance(rng, 0)).toBe(false);
      expect(chance(rng, 1)).toBe(true);
    }
  });
});
