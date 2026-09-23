# AeroOps Live

[![CI](https://github.com/haberlea/aeroops-live/actions/workflows/ci.yml/badge.svg)](https://github.com/haberlea/aeroops-live/actions/workflows/ci.yml)

A flight operations control dashboard for **Sofia International Airport (SOF)**. AeroOps Live presents a live departures/arrivals board, per-flight delay-risk scoring, and an aggregated operational intelligence view — all driven by a **deterministic in-browser simulation**. No backend, no API keys, no network calls.

> ⚠️ Demonstration software running on local mock data. Not for operational use.

## Features

- **Live flight board** — departures and arrivals for SOF with status lifecycle (On Time → Gate Open → Boarding → Final Call → Departed, and En Route → Landed), gates, terminals, and estimated times. Rows flash as they update.
- **Delay-risk scoring** — every flight gets a 0–100 risk score (Low / Medium / High) blending weather, terminal congestion, aircraft turnaround pressure, and delay already incurred, plus a predicted final delay.
- **Operational intelligence** — at-risk flight count, average predicted delay, most-affected terminal, a delay-reason breakdown, and a 5-hour congestion forecast anchored to the operational window.
- **Deterministic simulation** — a seeded PRNG (mulberry32) drives weather drift, lifecycle progression, and delays, so the demo replays identically on every load. Occasional simulated "Offline"/"Synchronizing" states model a real feed.
- **Controller actions** — inspect a flight in a detail drawer, notify ops, and reassign gates.
- **Filtering & persistence** — search and filter by status/terminal; view state (direction, filters, pause) survives reloads via `localStorage`.
- **Accessible by design** — status is never conveyed by color alone; every badge carries a glyph and label.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 8** (dev/build) with **Tailwind CSS 4**
- **Vitest** + Testing Library (unit tests)
- **Oxlint** (linting)

## Getting started

Requires Node.js 20+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server on http://localhost:5199
```

> The dev server is pinned to port **5199** to avoid colliding with the `air-flights` project on the default 5173.

### Build & preview

```bash
npm run build    # type-check (tsc -b) and build to dist/
npm run preview  # serve the production build locally
```

## Testing

The test suite focuses on the pure simulation and analytics logic — the deterministic core that the UI renders.

```bash
npm test             # run the suite once
npm run test:watch   # watch mode
npm run test:coverage
```

Covered modules:

| Area | Module | What's tested |
| --- | --- | --- |
| PRNG | `src/sim/rng.ts` | determinism, bounds, weighted distribution |
| Engine | `src/sim/engine.ts` | clock math, weather bands, step determinism & invariants |
| Risk | `src/utils/risk.ts` | congestion context, scoring, risk levels |
| Intelligence | `src/utils/intelligence.ts` | at-risk aggregation, reason breakdown, forecast |
| Enrichment | `src/data/enrich.ts` | deterministic per-flight detail, board invariants |
| Time | `src/utils/time.ts` | zoned formatting |
| Hooks | `src/hooks/usePersistentState.ts` | storage hydration & persistence |

## Project structure

```
src/
├── App.tsx              # top-level layout: board, intelligence, drawer
├── components/          # presentational UI (table, cards, charts, badges, drawer…)
├── hooks/
│   ├── useSimulation.ts     # drives the update loop, connection state, clock
│   └── usePersistentState.ts
├── sim/
│   ├── rng.ts               # seeded deterministic PRNG helpers
│   └── engine.ts            # one deterministic simulation step (pure)
├── data/
│   ├── flights.ts           # authored SOF flight board (mock)
│   └── enrich.ts            # deterministic operational enrichment
├── utils/
│   ├── risk.ts              # per-flight delay-risk model
│   ├── intelligence.ts      # airport-wide aggregation & forecast
│   ├── status.ts            # status → badge style/glyph
│   └── time.ts              # zoned time formatting
├── types.ts             # shared domain types
└── test/                # test setup + fixtures
```

## How the simulation works

All randomness flows through a single seeded PRNG (`SEED` in `useSimulation.ts`), so there is no wall-clock or network entropy — the same sequence of events replays on every load. Each refresh cycle advances the board one deterministic step (`simulateStep`), which drifts the weather, progresses flight lifecycles, and introduces or recovers delays. Risk and intelligence are derived from the whole board on every render.

## Documentation

Full reference documentation lives in [`docs/`](./docs/README.md):

| Document | Covers |
| --- | --- |
| [Architecture](./docs/architecture.md) | Layers, data flow, render pipeline, state ownership |
| [Domain model](./docs/domain-model.md) | `types.ts` reference, the authored board, deterministic enrichment |
| [Simulation](./docs/simulation.md) | Seeded PRNG, the engine step, the update loop, determinism guarantees |
| [Risk & intelligence](./docs/risk-and-intelligence.md) | The delay-risk formula, thresholds, aggregation, forecast |
| [UI reference](./docs/ui-reference.md) | Component catalogue, design tokens, accessibility, persisted state |
| [Development](./docs/development.md) | Scripts, testing strategy, linting, CI, extending the app |
