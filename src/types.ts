export type FlightDirection = 'departure' | 'arrival';

export type FlightStatus =
  | 'On Time'
  | 'Gate Open'
  | 'Boarding'
  | 'Final Call'
  | 'Departed'
  | 'Delayed'
  | 'Cancelled'
  | 'Landed'
  | 'En Route';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type DelayReason =
  | 'Weather'
  | 'Late Aircraft'
  | 'Air Traffic Control'
  | 'Technical'
  | 'Ground Handling';

export interface Flight {
  id: string;
  direction: FlightDirection;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  /** Destination city for departures, origin city for arrivals. */
  city: string;
  /** IATA code of the destination/origin airport. */
  cityCode: string;
  /** Scheduled time, local Sofia time, "HH:MM". */
  scheduled: string;
  /** Estimated time, "HH:MM". Null when cancelled. */
  estimated: string | null;
  terminal: 'T1' | 'T2';
  gate: string;
  status: FlightStatus;
  /** Delay in minutes; 0 when on time. */
  delayMinutes: number;

  // ── Enriched operational detail (deterministic per flight) ──
  aircraftType: string;
  registration: string;
  /** Total booked passengers. */
  passengers: number;
  /** Passengers boarded so far (departures). */
  boarded: number;
  /** Aircraft turnaround time in minutes. */
  turnaroundMin: number;
  /** Primary delay reason once a flight is delayed / at risk. */
  delayReason: DelayReason | null;

  // ── Transient local operations state (updated by controllers) ──
  opsNotifiedAt: string | null;
  gateReassigned: boolean;
}

/** The authored board before enrichment adds operational detail. */
export type BaseFlight = Omit<
  Flight,
  'aircraftType' | 'registration' | 'passengers' | 'boarded' | 'turnaroundMin' | 'delayReason' | 'opsNotifiedAt' | 'gateReassigned'
>;

export type ConnectionState = 'Connected' | 'Synchronizing' | 'Offline';

export interface Weather {
  /** 0 (calm) → 1 (severe). */
  severity: number;
  condition: string;
}

export interface RiskComponents {
  /** Each contribution is expressed 0–100. */
  weather: number;
  congestion: number;
  turnaround: number;
  delay: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  components: RiskComponents;
  /** Delay minutes we predict the flight will ultimately incur. */
  predictedDelay: number;
}

export interface DelayReasonDatum {
  reason: DelayReason;
  minutes: number;
  flights: number;
}

export interface ForecastDatum {
  hour: string;
  /** Congestion load, 0–100. */
  load: number;
  level: RiskLevel;
  movements: number;
}

export interface Intelligence {
  atRisk: number;
  avgPredictedDelay: number;
  mostAffectedTerminal: 'T1' | 'T2' | '—';
  reasons: DelayReasonDatum[];
  forecast: ForecastDatum[];
}
