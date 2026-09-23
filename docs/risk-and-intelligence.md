# Risk & intelligence

Two pure modules turn the flight board into decision support:
[`src/utils/risk.ts`](../src/utils/risk.ts) scores individual flights, and
[`src/utils/intelligence.ts`](../src/utils/intelligence.ts) aggregates the
airport-wide picture. Both are recomputed from scratch on every relevant
render; nothing is cached across steps.

> The model is a plausible-looking simulation for demonstration purposes. It is
> not calibrated against real operational data and must not be used to make
> real decisions.

## Per-flight risk

### Context

Risk is scored against a shared context built once per board state:

```ts
interface RiskContext {
  weather: Weather;
  congestion: Record<'T1' | 'T2', number>;  // 0–1 per terminal
}
```

`buildRiskContext` counts **active** flights (excluding `Departed`, `Landed`,
`Cancelled`) per terminal and normalises:

```ts
congestion: { T1: clamp01(t1 / 8), T2: clamp01(t2 / 14) }
```

The divisors differ because the terminals differ in capacity — T2 handles the
bulk of Sofia's scheduled traffic (29 of the 38 flights on the board). Using a
shared divisor would make T2 permanently look saturated and T1 permanently
calm, which would tell a controller nothing.

### Score

For active flights, four components are each normalised to 0–100 and then
weighted:

| Component | Normalisation | Weight |
| --- | --- | --- |
| Weather | `severity × 100` | **0.13** |
| Congestion | `congestion[terminal] × 100` | **0.15** |
| Turnaround | `clamp01((turnaroundMin − 28) / 30) × 100` | **0.32** |
| Delay incurred | `clamp01(delayMinutes / 45) × 100` | **0.40** |

```ts
const score = Math.round(
  0.13 * weather + 0.15 * congestion + 0.32 * turnaround + 0.40 * delay
);
```

The weighting is the model's core assumption, and it is stated in a comment in
the source: weather and congestion are *environmental* — shared by every
flight at a terminal, so they establish a floor rather than discriminate
between flights. Turnaround and already-incurred delay are *per-flight* and
carry 72 % of the weight between them, so the ranking a controller reads off
the board is driven mainly by flight-specific pressure.

The normalisation ceilings matter as much as the weights. Delay saturates at
**45 minutes**: beyond that a flight is already maximally at risk and further
minutes do not change the triage decision. Turnaround is normalised across the
**28–58 minute** band, which is exactly the range enrichment generates — so
the component spans its full 0–100 range across the real fleet rather than
bunching in the middle.

### Levels

```ts
score <  34            → 'Low'
score >= 34 && <= 64   → 'Medium'
score >  64            → 'High'
```

### Completed flights

Flights in `Departed`, `Landed`, or `Cancelled` short-circuit to a flat score
of **6**, level `Low`, all components zero, and `predictedDelay` equal to the
delay actually incurred. Six rather than zero keeps them visually distinct
from "not yet scored". `FlightTable` renders an em dash instead of a risk
badge for these rows, so the number is never shown — it exists so that
downstream aggregation can treat every flight uniformly.

### Predicted delay

```ts
predictedDelay = Math.round(delayMinutes + (score / 100) * 22);
```

Delay already incurred plus up to 22 further minutes, proportional to risk. A
high-risk flight is assumed to keep degrading; a low-risk one is assumed to
roughly hold its current position. This is the figure the drawer and the
intelligence panel both report.

### `buildRiskMap`

Returns `Map<flightId, RiskResult>` for the whole board. `App.tsx` memoises it
on `[flights, weather]` and passes it down to the table and drawer, so risk is
computed once per board state rather than once per row render.

## Airport-wide intelligence

`buildIntelligence(flights, riskById, simTime, weather)` produces five figures.
All of them ignore completed flights except the forecast, which counts all
non-cancelled movements.

### At-risk count and average predicted delay

Active flights whose level is not `Low`. The average is the mean
`predictedDelay` across exactly those flights, rounded — and is `0`, not
`NaN`, when nothing is at risk.

### Most affected terminal

Cumulative risk **score** per terminal (not flight count), so one severely
compromised terminal outranks one with more marginally-risky flights. Ties go
to T1 (`T1 >= T2`). With an empty or fully-completed board the result is `'—'`,
which the UI renders literally.

### Delay-reason breakdown

Each active flight that is either already delayed **or** scored above Low
contributes its `predictedDelay` minutes and a count of 1 to a bucket:

```ts
const reason = f.delayReason ?? reasonForFlight(f.id);
```

The fallback is what lets an *at-risk but not yet delayed* flight be
attributed to a cause. Because `reasonForFlight` is seeded from the flight id,
the attribution a flight receives while merely at risk is the same one it will
be assigned if it actually becomes delayed — the chart never reshuffles a
flight between causes.

All five reasons are always returned, in the fixed `REASON_ORDER` (Weather,
Late Aircraft, ATC, Technical, Ground Handling), zero-valued if unused, so bars
keep stable positions between refreshes.

### Congestion forecast

Five consecutive hours, anchored to the simulated clock:

```ts
const currentHour = sofiaHour(simTime);            // Europe/Sofia, 24h
const opHour = Math.min(Math.max(currentHour, 6), 10);
```

Clamping to 6–10 keeps the five-hour window inside the 06:00–14:00 operational
window the mock board covers — otherwise a demo opened at 22:00 local would
forecast five empty hours. Per hour:

```ts
const movements = <non-cancelled flights scheduled in that hour>;
const load = Math.min(100, Math.round(movements * 16 + weather.severity * 35));
```

So each movement adds 16 points of load and bad weather adds up to 35 points
across the board — weather degrades the whole forecast, traffic shapes its
profile. Forecast bands are **not** the same as flight risk bands:

```ts
load <  40  → 'Low'
load <  70  → 'Medium'
load >= 70  → 'High'
```

Note that the forecast keys off `scheduled`, not `estimated` — it is a picture
of planned demand, so it does not shift as individual flights slip.

## Reading the numbers together

A worked example. A T2 departure, 40-minute turnaround, 20 minutes already
delayed, moderate weather (severity 0.5), T2 at 10 of 14 active:

| Component | Raw | Weighted |
| --- | --- | --- |
| Weather | `0.5 × 100` = 50 | 6.5 |
| Congestion | `10/14 × 100` ≈ 71 | 10.7 |
| Turnaround | `(40−28)/30 × 100` = 40 | 12.8 |
| Delay | `20/45 × 100` ≈ 44 | 17.8 |
| **Score** | | **48 → Medium** |

Predicted delay: `20 + 0.48 × 22` ≈ **31 minutes**. The flight contributes 31
minutes to its reason bucket, counts toward `atRisk`, and adds 48 to T2's
cumulative terminal score.

## Test coverage

Both modules are tested directly, without rendering
([`risk.test.ts`](../src/utils/risk.test.ts),
[`intelligence.test.ts`](../src/utils/intelligence.test.ts)): congestion
ignores completed flights and clamps at 1; completed flights score 6; levels
sit correctly either side of the 34/64 boundaries; at-risk aggregation excludes
Low; the reason breakdown always returns five ordered entries; the forecast
returns five consecutive clamped hours. When retuning weights or thresholds,
expect the boundary tests to need updating — that is what they are for.
