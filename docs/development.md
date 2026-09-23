# Development

## Requirements

Node.js 20 or newer (CI runs Node 22). npm is the package manager;
`package-lock.json` is committed and CI installs with `npm ci`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on **http://localhost:5199** |
| `npm run build` | `tsc -b` then `vite build` → static `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Oxlint over the repo |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage |

The dev port is pinned to 5199 in `vite.config.ts` to avoid colliding with the
`air-flights` project on Vite's default 5173.

## Configuration files

| File | Purpose |
| --- | --- |
| `vite.config.ts` | React + Tailwind v4 plugins, dev port |
| `vitest.config.ts` | jsdom, globals, setup file, test glob |
| `tsconfig.json` | Project references to the two configs below |
| `tsconfig.app.json` | App sources — used by `tsc -b` during build |
| `tsconfig.node.json` | Build tooling (the Vite configs themselves) |
| `.oxlintrc.json` | Oxlint plugins and rules |

Two details that are easy to trip over:

- **Test config is separate from `vite.config.ts` on purpose.** If the `test`
  field lived in the Vite config, the production `tsc -b` build would try to
  type-check it and fail, since Vitest's types are not in the app's TS project.
  Vitest loads `vitest.config.ts` directly.
- **Tailwind v4 has no `tailwind.config.js`.** Theme tokens are declared in CSS
  with `@theme` in `src/index.css`; the `@tailwindcss/vite` plugin handles the
  rest.

## Linting

Oxlint with the `react`, `typescript`, and `oxc` plugins. Two rules are
configured explicitly:

- `react/rules-of-hooks`: **error**
- `react/only-export-components`: **warn** (with `allowConstantExport`)

CI fails on lint errors, so `rules-of-hooks` is effectively a gate — relevant
because `useSimulation` is where hook-ordering mistakes would show up.

## Testing

### Strategy

The suite covers the **deterministic core** — the pure simulation, scoring,
aggregation, and enrichment logic — rather than rendered output. That is
where the behaviour worth protecting lives, and it runs in milliseconds
without a DOM. Only `usePersistentState` needs jsdom.

There are deliberately no snapshot tests: the board changes on a timer, and
snapshots of a simulation would either be brittle or assert nothing.

| Module under test | File | What it asserts |
| --- | --- | --- |
| `sim/rng.ts` | `rng.test.ts` | Same seed → same sequence; different seeds diverge; values in `[0, 1)`; `hashString` stable and unsigned 32-bit; `randInt` inclusive at both endpoints; `pick` always in range; `weightedPick` roughly honours weights; `chance` correct at p=0 and p=1 |
| `sim/engine.ts` | `engine.test.ts` | `addMinutes` wraps both ways over midnight and pads; weather bands; step determinism; **no input mutation**; severity stays in `[0.1, 0.85]` over 200 steps; delay never exceeds 180 over 500 steps; `changed` reports every row that actually differs; delayed flights always get a reason |
| `utils/risk.ts` | `risk.test.ts` | Congestion ignores completed flights and clamps at 1; completed flights are negligible risk; Low and High classify as expected; predicted delay ≥ incurred delay; components cap at 100; `buildRiskMap` returns one entry per id |
| `utils/intelligence.ts` | `intelligence.test.ts` | Only active non-Low flights count as at-risk; average predicted delay; most-affected terminal; reason breakdown and fixed five-bucket order; 5-hour forecast anchored to the operational window; empty board does not divide by zero |
| `data/enrich.ts` | `enrich.test.ts` | Enrichment is stable across calls; every authored flight is enriched; plausible passenger loads; delay reasons only on delayed flights; boarded counts match lifecycle phase; authored fields survive untouched |
| `utils/time.ts` | `time.test.ts` | `formatShort` / `formatClock` / `formatStamp` output shapes; time zone is respected |
| `hooks/usePersistentState.ts` | `usePersistentState.test.ts` | Falls back to the initial value on empty storage; hydrates a stored value; persists updates; survives corrupt JSON |

### Test setup

[`src/test/setup.ts`](../src/test/setup.ts) registers
`@testing-library/jest-dom`, and after each test unmounts React trees and
clears `localStorage` so hook state never leaks between cases.

[`src/test/factories.ts`](../src/test/factories.ts) exports `makeFlight()`,
which builds a fully-formed `Flight` describing a calm, on-time departure.
Override only what a case cares about:

```ts
const f = makeFlight({ delayMinutes: 60, turnaroundMin: 55, status: 'Delayed' });
```

Use the factory rather than hand-building flight literals — when a field is
added to `Flight`, the factory is the only place that needs updating.

### Notes on writing tests here

- Pass an explicit `mulberry32(seed)` to anything that takes an `RNG`. Never
  let a test depend on the app's `SEED`.
- Prefer invariants over exact values for loop-driven behaviour (as
  `engine.test.ts` does with the severity clamp and the 180-minute ceiling) —
  those survive retuning the event probabilities.
- Do assert exact values for pure scoring functions; that is the point of
  making them pure.

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pushes and
pull requests to `main`: checkout → Node 22 with npm cache → `npm ci` →
`npm run lint` → `npm test` → `npm run build`. All four steps must pass; the
badge in the README reflects the `main` result.

Run the same sequence locally before pushing:

```bash
npm run lint && npm test && npm run build
```

## Extending the app

### Add flights to the board

Append `BaseFlight` records to [`src/data/flights.ts`](../src/data/flights.ts)
with a unique `id`. Enrichment is seeded per id, so new flights get stable
detail and existing flights are unaffected. Gate letters should match the
terminal (A→T1, B/C→T2), and keeping `scheduled` inside 06:00–14:00 keeps the
flight inside the forecast window.

If the carrier is new, add its IATA code to `AIRCRAFT_BY_CARRIER`, `CAPACITY`
(for any new aircraft type), and `REG_PREFIX` in `data/enrich.ts` — otherwise
it silently falls back to an A320 with an `XX-A` registration.

### Add a status, a simulation event, or retune rates

See [simulation.md § Extending the simulation](./simulation.md#extending-the-simulation).

### Change the risk model

Weights, normalisation ceilings, and level thresholds are literals in
`utils/risk.ts`. Changing them will break the boundary tests in
`risk.test.ts` and possibly the aggregation tests in `intelligence.test.ts` —
that is intended. Update the tables in
[risk-and-intelligence.md](./risk-and-intelligence.md) at the same time.

### Add a component

Keep it presentational: data in via props, changes out via callbacks. Pull
colour from the CSS tokens rather than hard-coding hex values, pair any status
colour with a glyph and a label, and guard new animations with
`prefers-reduced-motion`.

## Conventions

- **TypeScript is strict**, and `Record<Union, …>` lookup tables are used
  deliberately (`STATUS_STYLE`, `DEP_STAGE_INDEX`, `CAPACITY`) so extending a
  union surfaces every place that needs updating as a compile error.
- **Pure logic lives below the React boundary.** If a new piece of logic can be
  written as a function of its inputs, put it in `sim/`, `utils/`, or `data/`
  and test it directly.
- **No `Math.random`, no `Date.now()` in simulated values, no network.** See
  [simulation.md § Determinism](./simulation.md#determinism-what-is-and-is-not-guaranteed).
- **Comments explain why, not what.** The existing ones are worth reading —
  most of them record a decision (why the test config is split, why congestion
  divisors differ, why the boarding tick does not flash).
