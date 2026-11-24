import type {
  EnergyReading,
  Notice,
  ProductionStation,
  Session,
  WorkOrder,
} from '@/types';
import { demoEnergyReadings, demoFactory, demoStations } from '@/data/demoData';

/**
 * State shared between browser tabs (manager tab <-> worker tab).
 * Persisted in localStorage; other tabs are notified through the `storage` event.
 *
 * This is the single seam to replace with a real backend (Supabase / FastAPI):
 * loadShared / saveShared become API calls and the `storage` event becomes a
 * realtime subscription. Nothing else in the app touches localStorage.
 */
export interface SharedState {
  workOrders: WorkOrder[];
  notices: Notice[];
  /** Issue keys that have been confirmed resolved (machine:M17, station:C, energy:M03). */
  resolvedKeys: string[];
  stations: ProductionStation[];
  energyReadings: EnergyReading[];
  energyInputs: { actualEnergy: number; expectedEnergy: number; tariff: number };
  businessInputs: {
    downtimeHours: number;
    productionRate: number;
    contributionMargin: number;
    actualEnergy: number;
    expectedEnergy: number;
    tariff: number;
  };
  referenceStationId: string;
}

export const businessInputsDefault = {
  downtimeHours: 20,
  productionRate: 100,
  contributionMargin: 22.5,
  actualEnergy: 29520,
  expectedEnergy: 12240,
  tariff: 8,
};

export function defaultShared(): SharedState {
  return {
    workOrders: [],
    notices: [],
    resolvedKeys: [],
    stations: demoStations.map((s) => ({ ...s })),
    energyReadings: demoEnergyReadings.map((e) => ({ ...e })),
    energyInputs: { actualEnergy: 29520, expectedEnergy: 12240, tariff: 8 },
    businessInputs: { ...businessInputsDefault },
    referenceStationId: demoFactory.referenceStationId,
  };
}

export const SHARED_KEY = 'factoryiq.shared.v1';
const SESSION_KEY = 'factoryiq.session.v1';

// In-memory fallback for when storage is blocked (private mode, previews).
let memory: SharedState | null = null;

export function loadShared(): SharedState {
  const defaults = defaultShared();
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SharedState>;
      const merged = { ...defaults, ...parsed };
      memory = merged;
      return merged;
    }
  } catch {
    /* fall through to memory */
  }
  if (!memory) memory = defaults;
  return memory;
}

export function saveShared(state: SharedState): void {
  memory = state;
  try {
    localStorage.setItem(SHARED_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: state lives in memory only */
  }
}

export function clearShared(): void {
  memory = null;
  try {
    localStorage.removeItem(SHARED_KEY);
  } catch {
    /* ignore */
  }
}

// Session lives in sessionStorage so each browser TAB can be logged in as a
// different user (manager in one tab, worker in another) during a demo.
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
