# UI reference

All components live in [`src/components`](../src/components) and are
presentational: they receive data and callbacks from `App.tsx` and hold no
simulation state of their own. There is no component library and no charting
dependency — the charts are div-and-CSS bars.

## Layout

```
Header                            sticky · logo · Sofia + UTC clocks · connection · live/paused
├─ SummaryCards                   5 KPI cards for the active tab
├─ DelayIntelligence              at-risk · avg delay · terminal · weather
│  ├─ DelayReasonsChart           horizontal bars, predicted minutes by cause
│  └─ CongestionForecast          5-hour load forecast
├─ Tabs + SimControls             departures/arrivals · pause · refresh · last updated
├─ Filters                        search · status · terminal · result count
├─ FlightTable                    the board; rows open the drawer
│  ├─ StatusBadge
│  └─ RiskBadge
└─ FlightDrawer (overlay)         detail, timeline, risk breakdown, actions
   └─ ConfirmDialog               confirmation step for controller actions
```

## Component catalogue

| Component | Props | Notes |
| --- | --- | --- |
| `Header` | `now: Date`, `connection: ConnectionState`, `paused: boolean` | Sticky. Shows Sofia local and UTC clocks side by side, plus a `LIVE OPERATIONS` / `SIMULATION PAUSED` pill. |
| `ConnectionHealth` | `state: ConnectionState` | Coloured dot plus label; blinks (`sync-blink`) while Synchronizing. `title` exposes "Data link: …". |
| `SummaryCards` | `flights: Flight[]` | Five cards: Total, On Time, Delayed, Cancelled, Avg Delay. Percentages are of the **active tab's** flights, not the whole board. Avg delay averages only flights with delay > 0, and is 0 when there are none. |
| `DelayIntelligence` | `intelligence: Intelligence`, `weather: Weather` | Mini-stat row plus the two charts. |
| `DelayReasonsChart` | `data: DelayReasonDatum[]` | One measure across five categories → a single hue (amber). Bars scale to `max(1, …)` so an all-zero board renders flat rather than dividing by zero. Hover surfaces flight counts. |
| `CongestionForecast` | `data: ForecastDatum[]` | Load is a *state*, so bars use the Low/Medium/High status colours — always paired with the level label. |
| `Tabs` | `active`, `onChange`, `counts: Record<FlightDirection, number>` | Departures / Arrivals with live counts. |
| `SimControls` | `paused`, `onToggle`, `onRefresh` | Pause/resume and a manual refresh that applies one step immediately. |
| `Filters` | `value: FilterState`, `onChange`, `availableStatuses: FlightStatus[]`, `resultCount: number` | `availableStatuses` is computed from the active tab, so the dropdown never offers a status with no matches. |
| `FlightTable` | `flights`, `direction`, `riskById: Map<string, RiskResult>`, `updatedIds: Record<string, number>`, `onSelect` | Ten columns; header reads "Destination" or "Origin" depending on direction. Rows are keyboard-activatable and flash on change. |
| `StatusBadge` | `status: FlightStatus` | Glyph + label + colour. |
| `RiskBadge` | `level: RiskLevel`, `score?: number` | Score shown only in detail contexts; the table passes level alone. |
| `FlightDrawer` | `flight`, `risk`, `now`, `onClose`, `onUpdate` | Right-hand overlay, `role="dialog" aria-modal="true"`, closes on Escape, backdrop click, or the close button. |
| `ConfirmDialog` | `title`, `message`, `confirmLabel`, `tone?: 'primary' \| 'danger'`, `onConfirm`, `onCancel` | Escape cancels. Used for both controller actions. |

### FlightTable columns

Flight · Airline · Destination/Origin · Sched · Est · Term · Gate · Status ·
Risk · Delay.

Details worth knowing:

- The estimated-time cell turns amber when `delayMinutes > 0`; cancelled
  flights show `—` for both estimated time and gate, and the row drops to 70 %
  opacity.
- The risk column shows `—` for `Departed` / `Landed` / `Cancelled`, so the
  flat score of 6 those flights carry is never displayed.
- Rows sort by `scheduled` (set in `App.tsx`, not the table).
- The empty state prompts the user to clear filters rather than rendering a
  bare table.

### FlightDrawer

The richest component (~440 lines). It shows:

- **Route header** — flight number, carrier, `SOF → XXX` oriented by direction.
- **Timeline** — stages built by `buildTimeline()`, which works backwards from
  `estimated ?? scheduled` using `addMinutes` (gate open at −45 min, boarding
  at −35 min, and so on), marking each stage `done` / `current` / `pending`
  from `DEP_STAGE_INDEX` or `ARR_STAGE_INDEX`.
- **Boarding progress** — `boarded / passengers` as a percentage.
- **Risk breakdown** — the four `RiskComponents` and the predicted delay.
- **Recommendation** — a text action keyed off `delayReason` via the
  `RECOMMENDATION` map (e.g. Ground Handling → "Escalate to the ramp
  supervisor and add baggage crew…"). Flights with no attributed delay get the
  no-action-required line.
- **Controller actions** — *Notify ops* stamps `opsNotifiedAt` with the current
  Sofia time; *Reassign gate* picks a new gate from the terminal's gate list
  (`T1_GATES` = A1–A10, `T2_GATES` = B1–B9 + C1–C5) and sets
  `gateReassigned`. Both go through `ConfirmDialog` first and then through
  `onUpdate`, i.e. `useSimulation.updateFlight`.

## Design tokens

Colour lives in CSS custom properties declared under `@theme` in
[`src/index.css`](../src/index.css) and is referenced inline
(`style={{ color: 'var(--color-amber)' }}`) rather than through Tailwind colour
utilities — that keeps the status palette defined once.

| Group | Tokens |
| --- | --- |
| Surfaces | `--color-plane` `#0a0e14`, `--color-surface` `#111721`, `--color-surface-2` `#161d2a`, `--color-surface-3` `#1c2534` |
| Hairlines | `--color-hairline` `#26303f`, `--color-hairline-strong` `#33404f` |
| Ink | `--color-ink` `#f4f7fb`, `--color-ink-secondary` `#aeb9c7`, `--color-ink-muted` `#6f7d8f` |
| Status | `--color-blue` `#3987e5`, `--color-cyan` `#22c6e0`, `--color-amber` `#fab219`, `--color-red` `#ec5a5a`, `--color-green` `#2ec27e`, `--color-critical` `#d03b3b` |

The app is dark-only; `index.html` sets `data-theme="dark"` and there is no
light theme. The five accent hues are **reserved for status meaning** — they
are not used decoratively, which is what lets a controller read colour as
information. Numeric columns and clocks use `.tabular`
(`font-variant-numeric: tabular-nums`) so digits do not jitter as values
update.

### Status styling

[`src/utils/status.ts`](../src/utils/status.ts) maps every `FlightStatus` to a
`{ color, fill, glyph }` triple. Because it is typed
`Record<FlightStatus, StatusStyle>`, adding a status without adding its style
is a compile error.

| Status | Colour | Glyph |
| --- | --- | --- |
| On Time | green | ● |
| Gate Open | cyan | ⇢ |
| Boarding | blue | ↗ |
| Final Call | amber | ⏱ |
| Departed | ink-secondary | ✔ |
| Delayed | amber | ▲ |
| Cancelled | red | ✕ |
| Landed | green | ⬇ |
| En Route | cyan | ✈ |

### Animations

| Class | Effect |
| --- | --- |
| `.live-dot` | 2 s pulsing ring on the live indicator |
| `.sync-blink` | 0.9 s opacity blink while synchronizing |
| `.row-flash` | 2.4 s cyan fade on a changed row, one iteration |
| `.bar-fill` | 0.5 s width transition on chart bars |
| `.drawer-panel` / `.overlay-in` / `.dialog-in` | drawer and dialog entrances |

All of them are disabled under `@media (prefers-reduced-motion: reduce)`.

## Accessibility

The governing rule: **status is never conveyed by colour alone.** Every badge
pairs a hue with a glyph and a text label, forecast bars carry their level
name, and the delay-reasons chart labels values directly instead of relying on
a colour legend.

Beyond that:

- Table rows are `role="button"` with `tabIndex={0}`, activate on Enter or
  Space, and carry an `aria-label` of the form "FB 412 to London, Boarding.
  Open details".
- The drawer is `role="dialog" aria-modal="true"` with an `aria-label` naming
  the flight, and closes on Escape. `ConfirmDialog` also closes on Escape, and
  while a confirm dialog is open Escape is scoped to it rather than to the
  drawer behind it.
- Decorative glyphs are marked `aria-hidden`.
- Every animation respects `prefers-reduced-motion`.

## Persisted state

Three `localStorage` keys, all JSON-encoded:

| Key | Written by | Contents |
| --- | --- | --- |
| `aeroops.direction` | `usePersistentState` in `App` | `'departure'` or `'arrival'` |
| `aeroops.filters` | `usePersistentState` in `App` | `{ query, status, terminal }` |
| `aeroops.paused` | `useSimulation` directly | `boolean` |

`usePersistentState` hydrates in the `useState` initialiser and writes in an
effect, and swallows every storage error — corrupt JSON or a blocked store
(private browsing, disabled cookies) falls back to the initial value rather
than throwing. Clearing these three keys resets the view to defaults; it does
not reset the simulation, which always restarts from the fixed seed anyway.

One related behaviour lives in `App.tsx`: if a persisted status filter is not
present in the active tab (say, `Boarding` while viewing arrivals), an effect
resets that filter to `all` — otherwise a reload could land the user on an
empty board with no obvious cause.
