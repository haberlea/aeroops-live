# Simulation

The board is driven by a deterministic simulation rather than a live feed.
This document covers the PRNG, the engine step, and the React loop that drives
it.

## Why deterministic

A demo backed by `Math.random` looks different on every load, cannot be
screenshotted reproducibly, and cannot be unit-tested for invariants. Seeding
everything means:

- the same sequence of events replays identically on every page load;
- tests can assert exact values and full-board invariants, not just ranges;
- a bug seen once can be reproduced by reloading.

The rule that makes this hold: **no module outside `useSimulation` may create
entropy.** No `Math.random`, no `Date.now()` feeding into simulated values, no
network. Every draw comes from an `RNG` passed in as an argument.

## The PRNG — `src/sim/rng.ts`

```ts
export type RNG = () => number;   // returns [0, 1)
```

| Function | Purpose |
| --- | --- |
| `mulberry32(seed)` | The generator. Small, fast, well-distributed 32-bit PRNG. |
| `hashString(str)` | FNV-1a 32-bit hash. Turns a flight id into a seed. |
| `randInt(rng, min, max)` | Integer in `[min, max]`, inclusive both ends. |
| `pick(rng, items)` | One element, uniform. |
| `weightedPick(rng, items)` | One element from `{ value, weight }[]`; weights need not sum to 1. |
| `chance(rng, p)` | `true` with probability `p`. |

There are two distinct seeding patterns, and the difference is load-bearing:

- **One shared stream** for the simulation loop. A single `mulberry32(SEED)`
  lives in a ref in `useSimulation` and is advanced by every draw. Sequence
  order is therefore part of the state — reordering draws inside
  `simulateStep` changes the whole future of the simulation.
- **Per-entity seeds** for static detail. `mulberry32(hashString(id))` gives
  each flight its own independent stream, so enrichment is stable regardless of
  board order or board size.

## The engine step — `src/sim/engine.ts`

`simulateStep(flights, rng, weather)` is **pure**: same inputs and same RNG
state always produce the same output. It copies the input array
(`input.map(f => ({ ...f }))`) and never mutates its argument.

```ts
interface StepResult {
  flights: Flight[];
  changed: string[];   // ids that visibly changed — drives the row flash
  weather: Weather;
}
```

The step runs four phases in a fixed order.

### 0. Weather drift

With probability **0.25**, severity moves by up to ±0.1 and is clamped to
`[0.1, 0.85]`. The condition string is re-derived from the new severity:

| Severity | Condition |
| --- | --- |
| `< 0.25` | Clear · CAVOK |
| `< 0.45` | Scattered cloud · light wind |
| `< 0.65` | Low cloud · moderate wind |
| `< 0.80` | Rain showers · gusty |
| `≥ 0.80` | Low visibility · storm risk |

Severity never reaches 0 or 1: the clamp keeps the airport out of both
"perfect forever" and "permanently closed".

### 1. Lifecycle progression

Each non-done flight advances one phase with probability **0.13**. Departures
walk `On Time`/`Delayed` → `Gate Open` → `Boarding` → `Final Call` →
`Departed`; arrivals go `En Route` → `Landed`. Entering a phase snaps the
boarded count to a checkpoint: 20 % at `Boarding`, 90 % at `Final Call`, 100 %
at `Departed`. Flights that advance are added to `changed`.

### 2. Boarding tick

Flights already `Boarding` that did *not* change phase this step gain 8–20 % of
their passenger count, capped at `passengers - 4`. This is deliberately **not**
added to `changed` — it is ambient progress, and flashing the row every few
seconds for a progress bar creep would train the eye to ignore the flash. The
cap leaves the count just short of full so boarding never completes except by
advancing to `Final Call`.

### 3. Delay injection

With probability **0.55**, one eligible flight (a departure in `On Time`,
`Delayed`, or `Gate Open`; or an arrival `En Route`) picks up 5–25 extra
minutes, capped at 180 total. `On Time` becomes `Delayed`, a `delayReason` is
assigned via `reasonForFlight(id)` if absent, and `estimated` is recomputed as
`scheduled + delayMinutes`.

### 4. Delay recovery

With probability **0.22**, one delayed flight recovers 5–15 minutes. Reaching
zero clears the delay entirely: status returns to `On Time`, `delayReason`
becomes `null`, and `estimated` resets to `scheduled`.

Injection is more likely than recovery (0.55 vs 0.22) but recovery removes
delay faster per flight relative to its size, so the board degrades gradually
across a session without saturating at the 180-minute cap.

### Clock arithmetic

`addMinutes(hhmm, mins)` handles all `"HH:MM"` maths, wrapping at midnight in
both directions (negative offsets are used by the drawer timeline to compute
gate-open and boarding times backwards from the estimated departure). It is
exported because `FlightDrawer` needs the same wrap-safe arithmetic.

## The loop — `src/hooks/useSimulation.ts`

The hook is the only place in the app with timers, and the only place that
holds the shared RNG.

```ts
const SEED = 0x5eed1234;
const INITIAL_SEVERITY = 0.38;   // "Scattered cloud · light wind"
```

### Refs vs state

`flights`, `weather`, and `paused` are each held **twice** — once in React
state for rendering, once in a ref for the timer callbacks. The timers are
scheduled once and must read current values without being torn down and
rebuilt on every state change, which a state-dependency array would force.
Any write to `flights` must update both, which is why `updateFlight` assigns
`flightsRef.current` inside its updater.

### Cycle timing

```
scheduleNext()  ──▶ wait 8000 + rng()*4000 ms  ──▶ runCycle() ──▶ scheduleNext()
                                                       │
                          rng() < 0.08 ────────────────┤
                                                       │
                    ┌──────────────────────────────────┴───────────────────┐
                    ▼                                                      ▼
            connection = 'Offline'                        connection = 'Synchronizing'
            wait 1600 ms                                  wait 700 ms
            connection = 'Connected'                      applyStep(); 'Connected'
            (no step applied)                             
```

The interval itself is drawn from the shared RNG, so *when* things happen is as
reproducible as *what* happens. Roughly 8 % of cycles simulate a dropped feed:
the connection indicator goes Offline for 1.6 s and **no simulation step is
applied**, which is what a real outage looks like — a board that stops updating
rather than one that jumps.

`refreshNow()` (the Refresh button) runs a shortened 400 ms sync and always
applies a step; it cannot produce an outage.

### Pause

Pausing clears the cycle timers, forces the connection indicator back to
`Connected`, and stops the clock tick. Because the RNG lives in a ref, pausing
and resuming does not reseed or skip — the simulation continues from exactly
where it stopped. The pause flag is persisted to `localStorage` under
`aeroops.paused`, so a paused board stays paused across a reload.

### Change highlighting

`updatedIds` maps flight id → `Date.now()` of its last change. `FlightTable`
folds that timestamp into the row's React key:

```tsx
<tr key={`${f.id}:${flashed ?? 0}`} className={`… ${flashed ? 'row-flash' : ''}`}>
```

Changing the key remounts the row, which restarts the one-shot `row-flash`
animation (2.4 s, `ease-out`, one iteration) even when a flight changes twice
in a row. The timestamp is never compared against the clock — it is only an
identity token for "this is a new version of the row". This is the one place
where wall-clock time enters the system, it drives a visual effect only, and
it never feeds back into simulated state.

## Determinism: what is and is not guaranteed

**Deterministic** — identical on every load:

- all enriched flight detail (aircraft, registration, passengers, turnaround);
- the entire sequence of simulation steps, including weather drift, which
  flight is delayed at each step, by how much, and when outages occur;
- every derived risk score and reason breakdown, given the same board state.

**Not deterministic** — depends on wall clock or user input:

- `simTime`, which is initialised to `new Date()` and ticks once a second. The
  congestion forecast is anchored to the current hour (clamped to the 06–10
  operational window), so the forecast's *hour labels* depend on when the app
  is opened;
- row-flash timing, via `Date.now()` in `updatedIds`;
- anything downstream of controller actions, which are user-driven.

## Extending the simulation

- **New lifecycle phase** — add to `FlightStatus`, extend `nextStatus()`, add a
  style entry in `utils/status.ts` (the `Record<FlightStatus, …>` type makes
  this a compile error if forgotten), and add a stage index in
  `FlightDrawer`'s `DEP_STAGE_INDEX` / `ARR_STAGE_INDEX`.
- **New event type** — add a phase to `simulateStep` and append its draws
  **after** the existing ones if you want prior behaviour preserved; inserting
  draws earlier shifts the whole downstream stream.
- **Tuning rates** — the probabilities are inline literals in `simulateStep`.
  Existing engine tests assert invariants (statuses stay valid, delays stay in
  `[0, 180]`, done flights never regress) rather than exact rates, so
  retuning does not require rewriting them.
