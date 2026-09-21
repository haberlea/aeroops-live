/**
 * Deterministic pseudo-random utilities. Everything in the simulation draws
 * from these so the demo replays identically on every load — no Math.random,
 * no network, no wall-clock entropy.
 */

export type RNG = () => number;

/** mulberry32 — a small, fast, well-distributed seeded PRNG. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string — used to seed per-flight detail. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: RNG, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element deterministically. */
export function pick<T>(rng: RNG, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Weighted pick — weights need not sum to 1. */
export function weightedPick<T>(rng: RNG, items: readonly { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** True with probability p. */
export function chance(rng: RNG, p: number): boolean {
  return rng() < p;
}
