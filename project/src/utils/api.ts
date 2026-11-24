import type { Machine, ShapExplanation, OEEData, WorkOrder, Notice } from '@/types';
import { computeMLAnalysis, computeOEE } from '@/utils/calculations';

// A production frontend can use its hosted API URL; local Vite keeps using its dev proxy.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const API_BASE_URL = configuredApiBaseUrl || (typeof window !== 'undefined'
  ? (window.location.port === '5173' ? window.location.origin : `${window.location.protocol}//${window.location.hostname}:8001`)
  : 'http://localhost:8001');

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('factoryiq_session');
    if (raw) {
      const sess = JSON.parse(raw);
      return {
        'X-User-Role': sess.role ?? '',
        'X-User-Station': sess.stationId ?? '',
        'X-User-Id': sess.userId ?? '',
      };
    }
  } catch {}
  return {};
}

export async function fetchHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginApi(username: string, password: string, role?: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Authentication failed');
  }
  return await res.json();
}

export async function fetchLiveMachines(station?: string): Promise<any[] | null> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001';
    const url = new URL(`${API_BASE_URL}/api/machines`, base);
    if (station) url.searchParams.set('station', station);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful offline fallback
  }
  return null;
}

export async function resolveMachineApi(machineId: string, note = '') {
  const res = await fetch(`${API_BASE_URL}/api/machines/${encodeURIComponent(machineId)}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve machine issue' }));
    throw new Error(err.detail || 'Failed to resolve machine issue');
  }
  return await res.json();
}

export async function getMachineMLAnalysis(machine: Machine): Promise<ShapExplanation> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machine.id,
        telemetry: machine.telemetry,
        thresholds: machine.thresholds,
        downtime_events: machine.downtimeEvents,
        downtime_hours: machine.downtimeHours,
      }),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        modelType: data.model_type ?? 'XGBoost + Isolation Forest + SHAP',
        anomalyScore: data.anomaly_score,
        isAnomaly: data.is_anomaly,
        failureRiskPct: data.failure_risk_pct,
        diagnosisSummary: data.diagnosis_summary,
        topFeatures: data.top_features,
      };
    }
  } catch {
    // Graceful offline fallback
  }

  return computeMLAnalysis(machine);
}

export async function getOEEMetrics(downtimeRate: number): Promise<OEEData> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/metrics/oee`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return {
        overallOEE: data.overall_oee,
        availability: data.availability_pct,
        performance: data.performance_pct,
        quality: data.quality_pct,
        benchmark: data.world_class_benchmark,
        status: data.status,
      };
    }
  } catch {
    // Offline fallback
  }
  return computeOEE(downtimeRate);
}

// ── Stations API ──
export async function fetchStationsApi() {
  const res = await fetch(`${API_BASE_URL}/api/stations`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error('Failed to fetch stations');
  return await res.json();
}

export async function createStationApi(name: string, description?: string, id?: string) {
  const res = await fetch(`${API_BASE_URL}/api/stations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name, description, id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create station' }));
    throw new Error(err.detail || 'Failed to create station');
  }
  return await res.json();
}

// ── Supervisors API ──
export async function fetchSupervisorsApi() {
  const res = await fetch(`${API_BASE_URL}/api/supervisors`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error('Failed to fetch supervisors');
  return await res.json();
}

export async function createSupervisorApi(data: { name: string; username: string; password: string; station_id: string }) {
  const res = await fetch(`${API_BASE_URL}/api/supervisors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create supervisor' }));
    throw new Error(err.detail || 'Failed to create supervisor');
  }
  return await res.json();
}

// ── Workers API ──
export async function fetchWorkersApi(stationId?: string, supervisorId?: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001';
  const url = new URL(`${API_BASE_URL}/api/workers`, base);
  if (stationId) url.searchParams.set('station_id', stationId);
  if (supervisorId) url.searchParams.set('supervisor_id', supervisorId);
  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error('Failed to fetch workers');
  return await res.json();
}

export async function createWorkerApi(data: {
  name: string;
  username: string;
  password: string;
  specialization: string;
  station_id?: string;
  supervisor_id?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create worker' }));
    throw new Error(err.detail || 'Failed to create worker');
  }
  return await res.json();
}

export async function updateWorkerAvailabilityApi(workerId: string, available: boolean) {
  const res = await fetch(`${API_BASE_URL}/api/workers/${workerId}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ available }),
  });
  if (!res.ok) throw new Error('Failed to update availability');
  return await res.json();
}

export async function unregisterWorkerApi(workerId: string) {
  const res = await fetch(`${API_BASE_URL}/api/workers/${workerId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to unregister worker' }));
    throw new Error(err.detail || 'Failed to unregister worker');
  }
  return await res.json();
}

export async function fetchAdminHierarchyApi() {
  const res = await fetch(`${API_BASE_URL}/api/admin/hierarchy`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error('Failed to fetch admin hierarchy');
  return await res.json();
}

// ── Work Orders & Workflow API ──
export async function fetchWorkOrdersApi(): Promise<WorkOrder[]> {
  const res = await fetch(`${API_BASE_URL}/api/workorders`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error('Failed to fetch work orders');
  return await res.json();
}

export async function createWorkOrderApi(data: any) {
  const res = await fetch(`${API_BASE_URL}/api/workorders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create work order' }));
    throw new Error(err.detail || 'Failed to create work order');
  }
  return await res.json();
}

export async function adminAssignSupervisorApi(orderId: string, supervisorId: string, managerNote?: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/admin-assign-supervisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ supervisor_id: supervisorId, manager_note: managerNote }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assign supervisor' }));
    throw new Error(err.detail || 'Failed to assign supervisor');
  }
  return await res.json();
}

export async function supervisorAssignWorkerApi(orderId: string, workerId: string, note?: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/supervisor-assign-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ worker_id: workerId, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assign worker' }));
    throw new Error(err.detail || 'Failed to assign worker');
  }
  return await res.json();
}

export async function unassignWorkOrderApi(orderId: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/unassign-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to unassign worker' }));
    throw new Error(err.detail || 'Failed to unassign worker');
  }
  return await res.json();
}

export async function workerUpdateTaskApi(
  orderId: string,
  action: 'accept' | 'reject' | 'start' | 'block' | 'resolve',
  note?: string,
  blockedReason?: string,
  repairNotes?: string,
  partsUsed: Array<{ item_id: string; quantity: number }> = []
) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/worker-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      action,
      note: note || '',
      blocked_reason: blockedReason || '',
      repair_notes: repairNotes || '',
      parts_used: partsUsed,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update task' }));
    throw new Error(err.detail || 'Failed to update task');
  }
  return await res.json();
}

export async function supervisorVerifyCloseApi(orderId: string, verified: boolean, verificationNotes: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/supervisor-verify-close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ verified, verification_notes: verificationNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to verify and close work order' }));
    throw new Error(err.detail || 'Failed to verify and close work order');
  }
  return await res.json();
}

// ── Notices / Notifications API ──
export async function fetchNoticesApi(): Promise<Notice[]> {
  const res = await fetch(`${API_BASE_URL}/api/notices`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function markNoticeReadApi(noticeId: string) {
  try {
    await fetch(`${API_BASE_URL}/api/notices/${noticeId}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
  } catch {}
}

// ── Inventory API ──
export interface InventorySummary {
  totalSKUs: number;
  totalValuationInr: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stationId: string;
  compatibleMachines: string[];
  stockLevel: number;
  minThreshold: number;
  unitCostInr: number;
  locationBin: string;
  leadTimeDays: number;
  supplier: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  totalValuation: number;
  updatedAt?: string;
}

export async function fetchInventoryApi(params?: { station?: string; category?: string; status?: string; search?: string }): Promise<{ summary: InventorySummary; items: InventoryItem[] }> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001';
  const url = new URL(`${API_BASE_URL}/api/inventory`, base);
  if (params?.station) url.searchParams.set('station', params.station);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.search) url.searchParams.set('search', params.search);

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch inventory');
  }
  return await res.json();
}

export async function restockInventoryApi(itemId: string, quantity: number, note?: string) {
  const res = await fetch(`${API_BASE_URL}/api/inventory/${itemId}/restock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ quantity, note: note || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to restock item' }));
    throw new Error(err.detail || 'Failed to restock item');
  }
  return await res.json();
}

export async function consumeInventoryApi(itemId: string, quantity: number, workOrderId?: string, note?: string) {
  const res = await fetch(`${API_BASE_URL}/api/inventory/${itemId}/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ quantity, work_order_id: workOrderId || null, note: note || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to consume item' }));
    throw new Error(err.detail || 'Failed to consume item');
  }
  return await res.json();
}

export async function createInventoryItemApi(itemData: any) {
  const res = await fetch(`${API_BASE_URL}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(itemData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create inventory item' }));
    throw new Error(err.detail || 'Failed to create inventory item');
  }
  return await res.json();
}

export async function deleteInventoryItemApi(itemId: string) {
  const res = await fetch(`${API_BASE_URL}/api/inventory/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete inventory item' }));
    throw new Error(err.detail || 'Failed to delete inventory item');
  }
  return await res.json();
}

// ── Auto-Dispatch API ──
export async function autoDispatchWorkOrderApi(orderId: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/${orderId}/auto-dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Auto-dispatch failed' }));
    throw new Error(err.detail || 'Auto-dispatch failed');
  }
  return await res.json();
}

export async function dispatchStationQueueApi(stationId?: string) {
  const query = stationId ? `?station_id=${encodeURIComponent(stationId)}` : '';
  const res = await fetch(`${API_BASE_URL}/api/workorders/dispatch-station-queue${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Queue dispatch failed' }));
    throw new Error(err.detail || 'Queue dispatch failed');
  }
  return await res.json();
}

export async function autoAssignNewWorkOrderApi(machineId: string, title?: string, severity?: string) {
  const res = await fetch(`${API_BASE_URL}/api/workorders/auto-assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ machine_id: machineId, title, severity: severity || 'warning' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Auto-assign failed' }));
    throw new Error(err.detail || 'Auto-assign failed');
  }
  return await res.json();
}
