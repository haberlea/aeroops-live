# AeroOps Live — Documentation

Reference documentation for the AeroOps Live flight operations dashboard. The
[project README](../README.md) covers what the app is and how to run it; these
documents describe how it works internally.

| Document | Covers |
| --- | --- |
| [Architecture](./architecture.md) | Layers, data flow, render pipeline, module dependency rules |
| [Domain model](./domain-model.md) | `types.ts` reference, the authored board, deterministic enrichment |
| [Simulation](./simulation.md) | Seeded PRNG, the engine step, the update loop, determinism guarantees |
| [Risk & intelligence](./risk-and-intelligence.md) | The delay-risk formula, thresholds, airport-wide aggregation, forecast |
| [UI reference](./ui-reference.md) | Component catalogue with props, design tokens, accessibility, persisted state |
| [Development](./development.md) | Scripts, testing strategy, linting, CI, conventions for extending the app |

## Quick orientation

AeroOps Live is a **single-page React app with no backend**. Everything it
displays originates from an authored mock flight board (`src/data/flights.ts`)
that is enriched and then advanced by a deterministic simulation driven by a
seeded PRNG. There are no network calls, no API keys, and no server-side
component — `npm run build` produces a static `dist/` directory.

The three ideas worth internalising before reading further:

1. **Determinism is a design constraint, not a side effect.** All randomness
   flows through `mulberry32` seeds. `Math.random` is never used.
2. **The simulation layer is pure.** `simulateStep` takes state in and returns
   new state; React state, timers, and effects live only in `useSimulation`.
3. **Risk and intelligence are derived, never stored.** They are recomputed
   from the whole board on every render via `useMemo`, so they can never drift
   out of sync with the flights they describe.

> ⚠️ Demonstration software running on local mock data. Not for operational use.
