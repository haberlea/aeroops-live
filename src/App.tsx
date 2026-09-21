import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { DelayIntelligence } from './components/DelayIntelligence';
import { Tabs } from './components/Tabs';
import { Filters, type FilterState } from './components/Filters';
import { FlightTable } from './components/FlightTable';
import { SimControls } from './components/SimControls';
import { FlightDrawer } from './components/FlightDrawer';
import { useSimulation } from './hooks/useSimulation';
import { usePersistentState } from './hooks/usePersistentState';
import { buildRiskContext, buildRiskMap } from './utils/risk';
import { buildIntelligence } from './utils/intelligence';
import { formatStamp } from './utils/time';
import type { FlightDirection, FlightStatus } from './types';

const SOFIA_TZ = 'Europe/Sofia';
const DEFAULT_FILTERS: FilterState = { query: '', status: 'all', terminal: 'all' };

export default function App() {
  const { flights, weather, simTime, paused, connection, lastUpdated, updatedIds, togglePause, refreshNow, updateFlight } =
    useSimulation();

  const [direction, setDirection] = usePersistentState<FlightDirection>('aeroops.direction', 'departure');
  const [filters, setFilters] = usePersistentState<FilterState>('aeroops.filters', DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Risk + intelligence derived from the whole board (airport-wide picture).
  const riskById = useMemo(() => {
    const ctx = buildRiskContext(flights, weather);
    return buildRiskMap(flights, ctx);
  }, [flights, weather]);

  const intelligence = useMemo(
    () => buildIntelligence(flights, riskById, simTime, weather),
    [flights, riskById, simTime, weather],
  );

  const counts = useMemo<Record<FlightDirection, number>>(
    () => ({
      departure: flights.filter((f) => f.direction === 'departure').length,
      arrival: flights.filter((f) => f.direction === 'arrival').length,
    }),
    [flights],
  );

  const tabFlights = useMemo(() => flights.filter((f) => f.direction === direction), [flights, direction]);

  const availableStatuses = useMemo<FlightStatus[]>(() => {
    const seen = new Set<FlightStatus>();
    tabFlights.forEach((f) => seen.add(f.status));
    return Array.from(seen);
  }, [tabFlights]);

  const visibleFlights = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tabFlights
      .filter((f) => {
        if (filters.status !== 'all' && f.status !== filters.status) return false;
        if (filters.terminal !== 'all' && f.terminal !== filters.terminal) return false;
        if (q) {
          const haystack = `${f.flightNumber} ${f.airline} ${f.airlineCode} ${f.city} ${f.cityCode}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.scheduled.localeCompare(b.scheduled));
  }, [tabFlights, filters]);

  // Drop a status filter that no longer applies to the active tab.
  useEffect(() => {
    if (filters.status !== 'all' && !availableStatuses.includes(filters.status)) {
      setFilters((prev) => ({ ...prev, status: 'all' }));
    }
  }, [availableStatuses, filters.status, setFilters]);

  const selectedFlight = selectedId ? flights.find((f) => f.id === selectedId) ?? null : null;
  const selectedRisk = selectedFlight ? riskById.get(selectedFlight.id) : undefined;

  return (
    <div className="min-h-full">
      <Header now={simTime} connection={connection} paused={paused} />

      <main className="mx-auto max-w-[1600px] px-5 py-6">
        <SummaryCards flights={tabFlights} />

        <div className="mt-6">
          <DelayIntelligence intelligence={intelligence} weather={weather} />
        </div>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs active={direction} onChange={setDirection} counts={counts} />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-green)' }} />
                Last updated{' '}
                <span className="tabular font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
                  {formatStamp(lastUpdated, SOFIA_TZ)}
                </span>
              </div>
              <SimControls paused={paused} onToggle={togglePause} onRefresh={refreshNow} />
            </div>
          </div>

          <div className="mt-4">
            <Filters
              value={filters}
              onChange={setFilters}
              availableStatuses={availableStatuses}
              resultCount={visibleFlights.length}
            />
          </div>

          <div className="mt-4">
            <FlightTable
              flights={visibleFlights}
              direction={direction}
              riskById={riskById}
              updatedIds={updatedIds}
              onSelect={(f) => setSelectedId(f.id)}
            />
          </div>
        </section>

        <footer
          className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink-muted)' }}
        >
          <span>AeroOps Live · Flight Operations Control · Sofia International Airport (SOF)</span>
          <span>Deterministic simulation on local mock data — not for operational use.</span>
        </footer>
      </main>

      {selectedFlight && selectedRisk && (
        <FlightDrawer
          flight={selectedFlight}
          risk={selectedRisk}
          now={simTime}
          onClose={() => setSelectedId(null)}
          onUpdate={updateFlight}
        />
      )}
    </div>
  );
}
