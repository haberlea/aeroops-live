# Architecture

## Layers

The codebase is organised into five layers with a strict one-way dependency
flow. Nothing in a lower layer may import from a higher one.

```
                 ┌──────────────────────────────┐
  presentation   │ App.tsx · components/*       │  React, Tailwind, no logic
                 └──────────────┬───────────────┘
                                │ props
                 ┌──────────────┴───────────────┐
  state          │ hooks/useSimulation          │  timers, React state
                 │ hooks/usePersistentState     │  localStorage
                 └──────────────┬───────────────┘
                                │ pure calls
                 ┌──────────────┴───────────────┐
  derivation     │ utils/risk · utils/intel     │  pure, board → insight
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────┴───────────────┐
  simulation     │ sim/engine · sim/rng         │  pure, state → next state
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────┴───────────────┐
  data           │ data/flights · data/enrich   │  authored board + enrichment
                 └──────────────────────────────┘
```

`types.ts` sits outside the stack — every layer may import from it, and it
imports from nothing.

### Why this shape

The interesting logic (lifecycle progression, risk scoring, aggregation) is
pure and lives below the React boundary. That is what makes the test suite
small and fast: the suite exercises `sim/`, `utils/`, and `data/` directly
without rendering anything. Only `usePersistentState` needs a DOM.

## Data flow

A single pass through the application, from mock data to pixels:

```
data/flights.ts          38 authored BaseFlight records
        │
        ▼  enrichFlights()          — once, at hook initialisation
data/enrich.ts           Flight[] with aircraft, pax, turnaround, reason
        │
        ▼  useState initialiser
hooks/useSimulation      owns flights, weather, simTime, connection, paused
        │
        │  every 8–12 s: simulateStep(flights, rng, weather)
        │  ──────────────────────────────────────────────────▶ sim/engine.ts
        │  ◀────────────────────────────────────────────────── { flights, changed, weather }
        ▼
App.tsx                  useMemo: buildRiskContext → buildRiskMap
        │                useMemo: buildIntelligence(flights, riskById, simTime, weather)
        │                useMemo: filter by direction + FilterState, sort by scheduled
        ▼
components/*             SummaryCards · DelayIntelligence · FlightTable · FlightDrawer
```

### The recomputation contract

`App.tsx` recomputes risk for **every flight on the board** — not just the
visible tab — whenever `flights` or `weather` changes:

```ts
const riskById = useMemo(() => {
  const ctx = buildRiskContext(flights, weather);
  return buildRiskMap(flights, ctx);
}, [flights, weather]);
```

This is deliberate. Terminal congestion is an airport-wide property: a T2
departure's risk depends on how many other T2 flights are active, including
arrivals on the other tab. Scoping risk to the visible subset would produce
figures that change when the user switches tabs.

`buildIntelligence` additionally depends on `simTime`, because the congestion
forecast is anchored to the current operational hour. Since `simTime` ticks
every second, intelligence recomputes once per second — cheap at 38 flights,
but the reason the two memos are kept separate.

## Ownership of state

| State | Owner | Persisted |
| --- | --- | --- |
| `flights`, `weather`, `simTime`, `connection`, `lastUpdated`, `updatedIds` | `useSimulation` | no |
| `paused` | `useSimulation` (own `localStorage` access) | `aeroops.paused` |
| `direction` (departures/arrivals tab) | `App` via `usePersistentState` | `aeroops.direction` |
| `filters` (query, status, terminal) | `App` via `usePersistentState` | `aeroops.filters` |
| `selectedId` (open drawer) | `App` via `useState` | no |
| `dialog` (confirm step inside drawer) | `FlightDrawer` via `useState` | no |

`paused` is the one exception to the `usePersistentState` pattern: it reads and
writes `localStorage` directly inside `useSimulation`, because the hook needs
the persisted value in its own `useState` initialiser rather than receiving it
as a prop.

## Controller write path

Controller actions (notify ops, reassign gate) do not mutate flights in place.
`FlightDrawer` calls `onUpdate(id, patch)`, which is `useSimulation`'s
`updateFlight`:

```ts
const updateFlight = useCallback((id: string, patch: Partial<Flight>) => {
  setFlights((prev) => {
    const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
    flightsRef.current = next;   // keep the ref the engine reads in sync
    return next;
  });
  setUpdatedIds((prev) => ({ ...prev, [id]: Date.now() }));
  setLastUpdated(new Date());
}, []);
```

The `flightsRef.current` assignment matters: the simulation loop runs from
refs, not from React state, so a controller edit that only called `setFlights`
would be silently overwritten by the next `simulateStep`.

## Rendering conventions

- Components are **presentational**. They receive data and callbacks; none of
  them import from `sim/`, and only `FlightDrawer` imports a helper from the
  simulation layer (`addMinutes`, for timeline arithmetic).
- Layout uses Tailwind utility classes; **colour comes from CSS custom
  properties** declared in `src/index.css` under `@theme`, referenced inline as
  `style={{ color: 'var(--color-amber)' }}`. This keeps the status palette in
  one place and lets badges compose colour with translucent fills.
- No component library and no charting dependency. The two charts
  (`DelayReasonsChart`, `CongestionForecast`) are div-and-CSS bar charts.

## What is intentionally absent

- **No router.** The app is one view; departures/arrivals is tab state, not a
  route.
- **No global store.** Props flow at most two levels deep from `App`.
- **No API layer, no fetch, no service worker.** See
  [simulation.md](./simulation.md) for why the data feed is simulated instead.
- **No server.** `vite preview` serves the static build; any static host works.
