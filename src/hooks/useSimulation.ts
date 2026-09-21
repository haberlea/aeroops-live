import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionState, Flight, Weather } from '../types';
import { enrichFlights } from '../data/enrich';
import { simulateStep, weatherCondition } from '../sim/engine';
import { mulberry32, type RNG } from '../sim/rng';

/** Fixed seed → the simulation replays identically on every load. */
const SEED = 0x5eed1234;
const PAUSE_KEY = 'aeroops.paused';
const INITIAL_SEVERITY = 0.38;

function readPaused(): boolean {
  try {
    return JSON.parse(localStorage.getItem(PAUSE_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
}

export interface Simulation {
  flights: Flight[];
  weather: Weather;
  simTime: Date;
  paused: boolean;
  connection: ConnectionState;
  lastUpdated: Date;
  /** id → timestamp of the flight's most recent change (drives row flash). */
  updatedIds: Record<string, number>;
  togglePause: () => void;
  refreshNow: () => void;
  updateFlight: (id: string, patch: Partial<Flight>) => void;
}

export function useSimulation(): Simulation {
  const [flights, setFlights] = useState<Flight[]>(() => enrichFlights());
  const [weather, setWeather] = useState<Weather>(() => ({
    severity: INITIAL_SEVERITY,
    condition: weatherCondition(INITIAL_SEVERITY),
  }));
  const [paused, setPaused] = useState<boolean>(readPaused);
  const [connection, setConnection] = useState<ConnectionState>('Connected');
  const [simTime, setSimTime] = useState<Date>(() => new Date());
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [updatedIds, setUpdatedIds] = useState<Record<string, number>>({});

  const rngRef = useRef<RNG>(mulberry32(SEED));
  const flightsRef = useRef(flights);
  const weatherRef = useRef(weather);
  const pausedRef = useRef(paused);
  const cycleTimer = useRef<number | null>(null);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Apply one deterministic simulation step and surface the changes.
  const applyStep = useCallback(() => {
    const result = simulateStep(flightsRef.current, rngRef.current, weatherRef.current);
    flightsRef.current = result.flights;
    weatherRef.current = result.weather;
    setFlights(result.flights);
    setWeather(result.weather);
    if (result.changed.length) {
      const now = Date.now();
      setUpdatedIds((prev) => {
        const next = { ...prev };
        for (const id of result.changed) next[id] = now;
        return next;
      });
    }
    setLastUpdated(new Date());
  }, []);

  // A single refresh cycle: mostly a quick sync, occasionally an outage.
  const runCycle = useCallback(() => {
    if (rngRef.current() < 0.08) {
      setConnection('Offline');
      syncTimer.current = window.setTimeout(() => setConnection('Connected'), 1600);
      return;
    }
    setConnection('Synchronizing');
    syncTimer.current = window.setTimeout(() => {
      applyStep();
      setConnection('Connected');
    }, 700);
  }, [applyStep]);

  // Schedule the next cycle 8–12s out (deterministic interval).
  const scheduleNext = useCallback(() => {
    const delay = 8000 + Math.floor(rngRef.current() * 4000);
    cycleTimer.current = window.setTimeout(() => {
      runCycle();
      scheduleNext();
    }, delay);
  }, [runCycle]);

  // Drive the update loop; halt cleanly while paused.
  useEffect(() => {
    if (paused) {
      setConnection('Connected');
      return;
    }
    scheduleNext();
    return () => {
      if (cycleTimer.current) window.clearTimeout(cycleTimer.current);
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [paused, scheduleNext]);

  // Tick the simulated clock every second unless paused.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!pausedRef.current) setSimTime((t) => new Date(t.getTime() + 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      try {
        localStorage.setItem(PAUSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const refreshNow = useCallback(() => {
    setConnection('Synchronizing');
    syncTimer.current = window.setTimeout(() => {
      applyStep();
      setConnection('Connected');
    }, 400);
  }, [applyStep]);

  const updateFlight = useCallback((id: string, patch: Partial<Flight>) => {
    setFlights((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      flightsRef.current = next;
      return next;
    });
    setUpdatedIds((prev) => ({ ...prev, [id]: Date.now() }));
    setLastUpdated(new Date());
  }, []);

  return {
    flights,
    weather,
    simTime,
    paused,
    connection,
    lastUpdated,
    updatedIds,
    togglePause,
    refreshNow,
    updateFlight,
  };
}
