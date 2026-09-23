# Domain model

All shared types live in [`src/types.ts`](../src/types.ts). This document
explains what each type means operationally and where its values come from.

## Flight

`Flight` is the central record. It is assembled in three parts, which the type
definition marks with section comments.

### 1. Authored fields (`BaseFlight`)

Written by hand in [`src/data/flights.ts`](../src/data/flights.ts) and never
generated.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable key, `D-` / `A-` prefix plus flight number, e.g. `D-FB412`. Also the **seed source** for all enrichment — changing an id changes that flight's aircraft, passengers, and turnaround. |
| `direction` | `'departure' \| 'arrival'` | Selects the tab and the lifecycle track. |
| `flightNumber` | `string` | Display form with a space, e.g. `FB 412`. |
| `airline`, `airlineCode` | `string` | Carrier name and IATA code; the code drives fleet and registration lookup. |
| `city`, `cityCode` | `string` | Destination for departures, origin for arrivals. |
| `scheduled` | `string` | Local Sofia time, `"HH:MM"`. The board is sorted by this. |
| `estimated` | `string \| null` | `"HH:MM"`, or `null` when cancelled. |
| `terminal` | `'T1' \| 'T2'` | Feeds the congestion model. |
| `gate` | `string` | `A*` gates are T1, `B*`/`C*` are T2. |
| `status` | `FlightStatus` | Starting lifecycle phase. |
| `delayMinutes` | `number` | `0` when on time. |

### 2. Enriched fields

Derived deterministically from `id` by
[`src/data/enrich.ts`](../src/data/enrich.ts) — see [Enrichment](#enrichment).

| Field | Type | Notes |
| --- | --- | --- |
| `aircraftType` | `string` | Picked from the carrier's plausible fleet. |
| `registration` | `string` | Nationality-accurate prefix plus two letters. |
| `passengers` | `number` | Aircraft capacity × a 72–98 % load factor. |
| `boarded` | `number` | Passengers boarded so far; departures only. |
| `turnaroundMin` | `number` | 28–58 minutes. A **major risk input**. |
| `delayReason` | `DelayReason \| null` | Set once a flight is delayed. |

### 3. Controller state

Mutated only by user actions in the flight drawer, via `updateFlight`.

| Field | Type | Notes |
| --- | --- | --- |
| `opsNotifiedAt` | `string \| null` | `"HH:MM"` stamp when ops was notified. |
| `gateReassigned` | `boolean` | Marks the gate as manually changed. |

`BaseFlight` is defined as `Omit<Flight, …>` over exactly the enriched and
controller fields, so adding a generated field to `Flight` requires adding it
to that `Omit` list — otherwise the authored data in `flights.ts` fails to
type-check. This is intentional friction.

## FlightStatus and the two lifecycles

```ts
type FlightStatus =
  | 'On Time' | 'Gate Open' | 'Boarding' | 'Final Call' | 'Departed'
  | 'Delayed' | 'Cancelled' | 'Landed'   | 'En Route';
```

The nine statuses cover two separate tracks plus three cross-cutting states:

```
departures:  On Time ──▶ Gate Open ──▶ Boarding ──▶ Final Call ──▶ Departed
                ▲                                                      
             Delayed  (re-enters the track at Gate Open)               

arrivals:    En Route ──▶ Landed

terminal:    Departed · Landed · Cancelled   (never advance again)
```

The set `{ Departed, Landed, Cancelled }` recurs throughout the codebase as
the "done" set — `DONE` in `sim/engine.ts`, `utils/risk.ts`, and
`utils/intelligence.ts`, and `TERMINAL_STATES` in `FlightTable.tsx`. Done
flights are excluded from congestion counts, from at-risk aggregation, and
from lifecycle progression, and they score a flat risk of 6.

`Delayed` is not a phase but an overlay on the pre-departure state: a delayed
departure still advances to `Gate Open` next, and recovering all delay returns
it to `On Time`.

## RiskResult

```ts
interface RiskResult {
  score: number;              // 0–100
  level: RiskLevel;           // 'Low' | 'Medium' | 'High'
  components: RiskComponents; // weather / congestion / turnaround / delay, each 0–100
  predictedDelay: number;     // minutes we expect the flight to ultimately incur
}
```

`components` holds each contribution **before** weighting, so the drawer can
show a breakdown of why a flight scored the way it did. Multiply by the weights
in [risk-and-intelligence.md](./risk-and-intelligence.md) to reconstruct the
score.

## Intelligence

```ts
interface Intelligence {
  atRisk: number;                            // active flights at Medium or High
  avgPredictedDelay: number;                 // mean predicted delay across those
  mostAffectedTerminal: 'T1' | 'T2' | '—';   // by cumulative risk score
  reasons: DelayReasonDatum[];               // always 5 entries, fixed order
  forecast: ForecastDatum[];                 // always 5 entries, consecutive hours
}
```

`reasons` and `forecast` are **fixed-length**: the reason breakdown always
returns all five `DelayReason` values in `REASON_ORDER` (zero-valued if
unused), and the forecast always returns five hours. Charts can therefore
render without empty-state branches, and bars keep a stable position between
refreshes instead of reordering under the cursor.

## Weather and ConnectionState

```ts
interface Weather { severity: number; condition: string }  // severity 0 calm → 1 severe
type ConnectionState = 'Connected' | 'Synchronizing' | 'Offline';
```

`condition` is always derived from `severity` by `weatherCondition()` — the two
fields are never set independently, so the label cannot contradict the number.

## The authored board

[`src/data/flights.ts`](../src/data/flights.ts) contains 38 flights:

| Split | Count |
| --- | --- |
| Departures | 20 |
| Arrivals | 18 |
| Terminal 1 | 9 |
| Terminal 2 | 29 |

Opening statuses: 10 On Time, 10 En Route, 9 Delayed, 3 Landed, 2 Boarding,
2 Gate Open, 2 Cancelled. Scheduled times span the 06:00–14:00 operational
window that the congestion forecast is anchored to.

The T1/T2 imbalance is real-world accurate for Sofia (T2 handles the scheduled
carriers) and is compensated for in the congestion model, which normalises T1
against 8 active flights and T2 against 14 rather than using a shared divisor.

## Enrichment

`enrichFlights()` maps each `BaseFlight` to a full `Flight` using a PRNG seeded
from the flight's id:

```ts
const rng = mulberry32(hashString(f.id));
const fleet = AIRCRAFT_BY_CARRIER[f.airlineCode] ?? ['A320'];
const aircraftType = pick(rng, fleet);
const capacity = CAPACITY[aircraftType] ?? 180;
const loadFactor = 0.72 + rng() * 0.26;      // 72–98 %
const passengers = Math.round(capacity * loadFactor);
const registration = makeRegistration(rng, f.airlineCode);
const turnaroundMin = randInt(rng, 28, 58);
```

Because the seed is the id and the draws happen in a fixed order, every flight
gets the same aircraft, registration, passenger count, and turnaround on every
load — and adding a flight to the board does not disturb the enrichment of any
other flight. That independence is why enrichment seeds per-flight rather than
drawing from one shared stream.

Three lookup tables back this up, all keyed by IATA carrier code:
`AIRCRAFT_BY_CARRIER` (plausible fleet), `CAPACITY` (seats by type), and
`REG_PREFIX` (nationality-accurate registration stem, e.g. `LZ-F` for Bulgaria
Air, `TC-J` for Turkish). Unknown carriers fall back to an A320 with 180 seats
and an `XX-A` registration.

`reasonForFlight(id)` is exported separately and seeded from `` `${id}:reason` ``
— a distinct seed from the one enrichment uses, so a flight's delay cause is
independent of its aircraft. It is called from two places: enrichment (for
flights that start delayed) and the engine (when a flight becomes delayed
mid-simulation). Both produce the same reason for the same flight, which is
what lets `buildIntelligence` attribute a cause to an at-risk flight that has
not actually been delayed yet.

Reason weights: Late Aircraft 32, Weather 24, ATC 20, Ground Handling 14,
Technical 10 — roughly matching published European delay-cause distributions.
