import type {
  CriticalIssue,
  EnergyReading,
  IssueCategory,
  Machine,
  MachineStatus,
  Priority,
  ProductionStation,
  Worker,
  WorkOrder,
} from '@/types';
import { computeFailureRisk, topRiskFactor } from '@/utils/calculations';

export const issueKeys = {
  machine: (id: string) => `machine:${id}`,
  station: (id: string) => `station:${id}`,
  energy: (id: string) => `energy:${id}`,
};

export function normalizeMachineId(id: string): string {
  const m = /^M0*(\d+)$/i.exec(id.trim());
  return m ? `M${m[1].padStart(2, '0')}` : id;
}

export function energyStatus(r: Pick<EnergyReading, 'powerDraw' | 'referencePower'>): MachineStatus {
  const ratio = r.referencePower > 0 ? r.powerDraw / r.referencePower : 0;
  if (ratio >= 2) return 'critical';
  if (ratio >= 1.25) return 'warning';
  return 'normal';
}

export function categoryForMachine(m: Machine): IssueCategory {
  if (m.primaryIssue) return m.primaryIssue.category;
  const vibOrTemp =
    m.vibration >= m.thresholds.vibWarn || m.temperature >= m.thresholds.tempWarn;
  if (vibOrTemp) return 'mechanical';
  return 'electrical';
}

export const categoryLabel: Record<IssueCategory, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  production: 'Production',
};

export function isActive(wo: WorkOrder): boolean {
  return wo.status !== 'resolved' && wo.status !== 'closed' && wo.status !== 'cancelled';
}

interface BuildArgs {
  machines: Machine[];
  stations: ProductionStation[];
  bottleneck: ProductionStation;
  throughputGap: number;
  relativeGap: number;
  referenceThroughput: number;
  energyReadings: EnergyReading[];
  resolvedKeys: string[];
}

export function buildIssues(a: BuildArgs): CriticalIssue[] {
  const out: CriticalIssue[] = [];

  for (const m of a.machines) {
    if (m.status === 'normal') continue;
    const risk = computeFailureRisk(m);
    const factor = topRiskFactor(m);
    out.push({
      id: issueKeys.machine(m.id),
      source: 'machine',
      machineId: m.id,
      stationId: m.station,
      title: `${m.id} — ${m.primaryIssue?.label ?? `${factor.factor}${risk >= 70 ? ' & elevated failure risk' : ''}`}`,
      detail: `${m.issues.join('. ')}. Estimated failure risk ${risk}%.`,
      action: m.recommendedAction,
      page: 'machines',
      severity: m.status === 'critical' ? 'critical' : 'warning',
      category: categoryForMachine(m),
    });
  }

  return out.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'critical' ? -1 : 1));
}

export function defaultPriority(severity: 'warning' | 'critical'): Priority {
  return severity === 'critical' ? 'High' : 'Medium';
}

export function defaultDueHours(severity: 'warning' | 'critical'): number {
  return severity === 'critical' ? 4 : 24;
}

export interface Suggestion {
  worker: Worker | null;
  reason: string;
}

export function suggestWorker(
  issue: CriticalIssue,
  workers: Worker[],
  workOrders: WorkOrder[]
): Suggestion {
  const load = (id: string) =>
    workOrders.filter((w) => w.assigneeId === id && isActive(w)).length;
  const skilled = workers.filter((w) => w.skills.includes(issue.category));
  const pool = skilled.length ? skilled : workers;
  const ranked = [...pool].sort(
    (a, b) =>
      Number(b.available) - Number(a.available) ||
      load(a.id) - load(b.id) ||
      a.skills.length - b.skills.length
  );
  const best = ranked[0] ?? null;
  if (!best) return { worker: null, reason: 'No workers available.' };
  const n = load(best.id);
  const reason = `${categoryLabel[issue.category]} skills${best.available ? ', on shift' : ', off shift'} · ${n} open task${n === 1 ? '' : 's'}`;
  return { worker: best, reason };
}
