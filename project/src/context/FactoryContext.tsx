import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CriticalIssue,
  EnergyReading,
  Machine,
  Manager,
  Notice,
  PageId,
  Priority,
  ProductionStation,
  Session,
  Worker,
  WorkOrder,
  WorkOrderEvent,
} from '@/types';
import { fetchLiveMachines, fetchWorkOrdersApi, fetchNoticesApi, fetchWorkersApi } from '@/utils/api';
import {
  demoFactory,
  demoMachines,
  demoManager,
  demoWorkers,
} from '@/data/demoData';
import { detectMachineIssues, topRiskFactor, computeMachineRupeesAtRisk } from '@/utils/calculations';
import {
  buildIssues,
  energyStatus,
  isActive,
  issueKeys,
  suggestWorker as suggestWorkerFn,
  type Suggestion,
} from '@/utils/issues';
import {
  SHARED_KEY,
  clearShared,
  defaultShared,
  loadShared,
  saveShared,
  type SharedState,
} from '@/utils/storage';
import { useAuth } from '@/context/AuthContext';

type Result = { ok: true } | { ok: false; error: string };
interface LiveWorker {
  id: string;
  name: string;
  username?: string;
  email?: string;
  specialization?: string;
  available?: boolean;
  stationId?: string;
  supervisorId?: string;
}
const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

export interface AssignInput {
  issue: CriticalIssue;
  assigneeId: string;
  priority: Priority;
  dueAt: string;
  note: string;
}

interface FactoryContextValue {
  machines: Machine[];
  allMachines: Machine[];
  stations: ProductionStation[];
  energyReadings: EnergyReading[];
  factory: typeof demoFactory;
  workers: Worker[];
  manager: Manager;

  workOrders: WorkOrder[];
  notices: Notice[];
  unreadNoticeCount: number;
  issues: CriticalIssue[];
  criticalIssues: CriticalIssue[];
  warningIssues: CriticalIssue[];
  activeOrderForIssue: (issueKey: string) => WorkOrder | undefined;
  suggestWorker: (issue: CriticalIssue) => Suggestion;
  hourlyDelayCost: number;

  createWorkOrder: (input: AssignInput) => Result;
  reassignWorkOrder: (orderId: string, assigneeId: string) => Result;
  confirmResolved: (orderId: string) => Result;
  reopenWorkOrder: (orderId: string, reason: string) => Result;
  resolveIssueDirectly: (issueKey: string) => Result;
  refreshLiveData: () => Promise<void>;
  markNoticeRead: (noticeId: string) => void;
  markAllNoticesRead: () => void;
  updateEnergyReading: (
    machineId: string,
    patch: Partial<Pick<EnergyReading, 'powerDraw' | 'referencePower'>>
  ) => Result;
  updateStationThroughput: (stationId: string, throughput: number) => void;
  setReferenceStation: (stationId: string) => void;
  resetDemo: () => void;

  startWorkOrder: (orderId: string) => Result;
  addWorkOrderNote: (orderId: string, text: string) => Result;
  markSolved: (orderId: string, text: string) => Result;

  referenceStationId: string;
  referenceThroughput: number;
  bottleneckStation: ProductionStation;
  throughputGap: number;
  relativeGap: number;
  summary: {
    totalMachines: number;
    normalCount: number;
    warningCount: number;
    criticalCount: number;
    productionEfficiency: number;
    downtimeRate: number;
    energyConsumption: number;
    monthlySavingsOpportunity: number;
  };
  energyInputs: SharedState['energyInputs'];
  setEnergyInputs: (v: SharedState['energyInputs']) => void;
  businessInputs: SharedState['businessInputs'];
  setBusinessInputs: (v: SharedState['businessInputs']) => void;
}

const FactoryContext = createContext<FactoryContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

export function FactoryProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [shared, setShared] = useState<SharedState>(() => loadShared());
  const [dbMachines, setDbMachines] = useState<any[] | null>(null);
  const [dbOrders, setDbOrders] = useState<WorkOrder[] | null>(null);
  const [dbNotices, setDbNotices] = useState<Notice[] | null>(null);
  const [dbWorkers, setDbWorkers] = useState<LiveWorker[] | null>(null);

  const refreshLiveData = useCallback(async () => {
    const [live, orders, notifs, liveWorkers] = await Promise.all([
      session?.role !== 'worker' ? fetchLiveMachines().catch(() => null) : Promise.resolve(null),
      fetchWorkOrdersApi().catch(() => null),
      fetchNoticesApi().catch(() => null),
      fetchWorkersApi().catch(() => null),
    ]);
    if (live !== null) setDbMachines(live);
    if (orders !== null && Array.isArray(orders)) setDbOrders(orders);
    if (notifs !== null && Array.isArray(notifs)) setDbNotices(notifs);
    if (liveWorkers !== null && Array.isArray(liveWorkers)) setDbWorkers(liveWorkers);
  }, [session]);

  useEffect(() => {
    void refreshLiveData();
    const interval = setInterval(() => void refreshLiveData(), 5000);
    return () => clearInterval(interval);
  }, [refreshLiveData]);

  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;
  const userNameRef = useRef<string>('');
  userNameRef.current = user?.name ?? '';

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHARED_KEY || e.key === null) setShared(loadShared());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const mutate = useCallback(<R,>(fn: (cur: SharedState) => { next: SharedState; result: R }): R => {
    const cur = loadShared();
    const { next, result } = fn(cur);
    if (next !== cur) {
      saveShared(next);
      setShared(next);
    }
    return result;
  }, []);

  const requireManagerOrSupervisor = (): Result | null => {
    const s = sessionRef.current;
    if (!s) return fail('Please sign in.');
    if (s.role !== 'manager' && s.role !== 'admin' && s.role !== 'supervisor') {
      return fail('Only a Manager or Station Supervisor can perform this action.');
    }
    return null;
  };

  const { stations, energyInputs, businessInputs, referenceStationId } = shared;
  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = session?.stationId;

  const allMachines: Machine[] = useMemo(
    () => {
      if (!dbMachines) return [];
      return dbMachines.flatMap((live) => {
        const m = demoMachines.find((template) => template.id === live.id);
        if (!m) return [];
        const curTemp = live.temperature;
        const curVib = live.vibration;
        const curPower = live.power;
        const curHealth = live.healthScore;
        const thresholds = live.thresholds || m.thresholds;
        const curStatus = live.status as Machine['status'];

        const base: Machine = {
          ...m,
          name: live.name,
          type: live.type,
          station: live.station,
          thresholds,
          temperature: curTemp,
          tempBearing: live.tempBearing,
          tempMotor: live.tempMotor,
          vibration: curVib,
          power: curPower,
          healthScore: curHealth,
          downtimeHours: live?.downtimeHours ?? m.downtimeHours,
          downtimeEvents: live?.downtimeEvents ?? m.downtimeEvents,
          failureRisk: live?.failureRisk ?? undefined,
          recommendedAction: live?.recommendedAction || m.recommendedAction,
          priority: live?.priority || m.priority,
          status: curStatus,
          rupeesAtRisk: (live.rupeesAtRisk && live.rupeesAtRisk > 0)
            ? live.rupeesAtRisk
            : computeMachineRupeesAtRisk({
                status: curStatus,
                power: curPower,
                station: m.station,
                healthScore: curHealth,
                vibration: curVib,
                temperature: curTemp,
              }),
          issues: detectMachineIssues({
            ...m,
            temperature: curTemp,
            tempBearing: live.tempBearing,
            tempMotor: live.tempMotor,
            vibration: curVib,
            power: curPower,
            downtimeHours: live?.downtimeHours ?? m.downtimeHours,
            downtimeEvents: live?.downtimeEvents ?? m.downtimeEvents,
            status: curStatus,
            thresholds,
            recommendedAction: live?.recommendedAction || m.recommendedAction,
          }),
        };
        return base;
      });
    },
    [dbMachines]
  );

  // Scoped machines: if supervisor, strictly their station's machines (e.g. Station A = 13 machines)
  const machines: Machine[] = useMemo(() => {
    if (isSupervisor && supervisorStation) {
      return allMachines.filter((m) => m.station === supervisorStation);
    }
    return allMachines;
  }, [allMachines, isSupervisor, supervisorStation]);

  const workers: Worker[] = useMemo(() => {
    if (dbWorkers === null) return [];
    return dbWorkers.map((worker) => {
      const specialization = String(worker.specialization ?? 'General Maintenance');
      const normalized = specialization.toLowerCase();
      const skills = (['mechanical', 'electrical', 'production'] as const)
        .filter((skill) => normalized.includes(skill));
      return {
        id: worker.id,
        name: worker.name,
        username: worker.username,
        email: worker.email ?? '',
        jobTitle: specialization,
        specialization,
        skills: skills.length ? [...skills] : ['mechanical', 'electrical', 'production'],
        available: Boolean(worker.available),
        stationId: worker.stationId,
        supervisorId: worker.supervisorId,
      };
    });
  }, [dbWorkers]);

  const energyReadings: EnergyReading[] = useMemo(
    () =>
      shared.energyReadings.map((e) => ({
        ...e,
        status: shared.resolvedKeys.includes(issueKeys.energy(e.machineId))
          ? 'normal'
          : energyStatus(e),
      })),
    [shared.energyReadings, shared.resolvedKeys]
  );

  const referenceThroughput =
    stations.find((s) => s.id === referenceStationId)?.throughput ??
    demoFactory.referenceThroughput;

  const bottleneckStation = useMemo(
    () => stations.reduce((min, s) => (s.throughput < min.throughput ? s : min)),
    [stations]
  );
  const throughputGap = Math.max(0, referenceThroughput - bottleneckStation.throughput);
  const relativeGap = referenceThroughput > 0 ? (throughputGap / referenceThroughput) * 100 : 0;

  const issues = useMemo(
    () =>
      buildIssues({
        machines,
        stations,
        bottleneck: bottleneckStation,
        throughputGap,
        relativeGap,
        referenceThroughput,
        energyReadings,
        resolvedKeys: shared.resolvedKeys,
      }),
    [machines, stations, bottleneckStation, throughputGap, relativeGap, referenceThroughput, energyReadings, shared.resolvedKeys]
  );
  const criticalIssues = useMemo(() => issues.filter((i) => i.severity === 'critical'), [issues]);
  const warningIssues = useMemo(() => issues.filter((i) => i.severity === 'warning'), [issues]);

  const summary = useMemo(() => {
    const totalMachines = machines.length;
    const normalCount = machines.filter((m) => m.status === 'normal').length;
    const warningCount = machines.filter((m) => m.status === 'warning').length;
    const criticalCount = machines.filter((m) => m.status === 'critical').length;
    
    // This is a status-weighted estimate because the backend does not provide
    // an operating-time denominator for a measured downtime percentage.
    const downtimeRate = totalMachines > 0 
      ? Number(((criticalCount * 4.2 + warningCount * 1.5) / totalMachines * 10).toFixed(1))
      : 0;
    const productionEfficiency = Math.max(50, Math.min(99, Number((100 - downtimeRate * 1.2).toFixed(1))));

    // Sum actual rupees at risk
    const monthlySavingsOpportunity = machines.reduce((acc, m) => acc + (m.rupeesAtRisk || 0), 0)
      || (criticalCount * 28000 + warningCount * 12000);

    return {
      totalMachines,
      normalCount,
      warningCount,
      criticalCount,
      productionEfficiency,
      downtimeRate,
      energyConsumption: Math.round(machines.reduce((acc, m) => acc + (m.power || 15), 0) * 24),
      monthlySavingsOpportunity,
    };
  }, [machines]);

  // Backend work orders are authoritative; local cached orders can be stale.
  const rawOrders: WorkOrder[] = useMemo(() => {
    return dbOrders ?? [];
  }, [dbOrders]);

  // Backend notices are authoritative; local cached notices can be stale.
  const rawNotices: Notice[] = useMemo(() => {
    return dbNotices ?? [];
  }, [dbNotices]);

  // Scoped Work Orders:
  // - Manager sees all orders
  // - Supervisor sees orders strictly matching their stationId
  // - Worker sees orders assigned to them
  const workOrders = useMemo(() => {
    if (!session) return [];
    if (session.role === 'manager' || session.role === 'admin') return rawOrders;
    if (session.role === 'supervisor') {
      return rawOrders.filter((w) => {
        if (w.stationId && w.stationId === session.stationId) return true;
        const m = machines.find((mac) => mac.id === w.machineId);
        return m?.station === session.stationId;
      });
    }
    return rawOrders.filter((w) => w.assigneeId === session.userId);
  }, [rawOrders, session, machines]);

  // Scoped Notices:
  // - Manager sees all notices
  // - Supervisor sees notices strictly for work orders in their station
  const notices = useMemo(() => {
    if (!session) return [];
    if (session.role === 'manager' || session.role === 'admin') return [...rawNotices];
    if (session.role === 'supervisor') {
      return rawNotices
        .filter((n) => {
          if (n.stationId && n.stationId === session.stationId) return true;
          const wo = rawOrders.find((w) => w.id === n.workOrderId);
          if (!wo) return false;
          if (wo.stationId === session.stationId) return true;
          const m = machines.find((mac) => mac.id === wo.machineId);
          return m?.station === session.stationId;
        });
    }
    if (session.role === 'worker') {
      return rawNotices.filter((n) => n.workerId === session.userId);
    }
    return [];
  }, [rawNotices, rawOrders, session, machines]);

  const unreadNoticeCount = notices.filter((n) => !n.read).length;
  const hourlyDelayCost = businessInputs.productionRate * businessInputs.contributionMargin;

  const activeOrderForIssue = useCallback(
    (issueKey: string) => {
      const machineId = issueKey.startsWith('machine:') ? issueKey.slice('machine:'.length) : undefined;
      return workOrders.find((w) => w.issueKey === issueKey && isActive(w))
        ?? (machineId ? workOrders.find((w) => w.machineId === machineId && isActive(w)) : undefined);
    },
    [workOrders]
  );

  const suggestWorker = useCallback(
    (issue: CriticalIssue) => suggestWorkerFn(issue, workers, rawOrders),
    [rawOrders, workers]
  );

  const event = (kind: WorkOrderEvent['kind'], message: string): WorkOrderEvent => ({
    at: nowIso(),
    by: sessionRef.current?.userId ?? '',
    byName: userNameRef.current,
    kind,
    message,
  });

  const patchOrder = (
    cur: SharedState,
    id: string,
    fn: (wo: WorkOrder) => WorkOrder
  ): SharedState => ({
    ...cur,
    workOrders: cur.workOrders.map((w) => (w.id === id ? fn(w) : w)),
  });

  const makeNotice = (
    cur: SharedState,
    wo: WorkOrder,
    kind: Notice['kind'],
    title: string,
    message: string
  ): Notice => ({
    id: `N-${cur.notices.length + 1001}`,
    workOrderId: wo.id,
    kind,
    workerId: sessionRef.current?.userId ?? '',
    workerName: userNameRef.current,
    title,
    message,
    createdAt: nowIso(),
    read: false,
  });

  const createWorkOrder = (input: AssignInput): Result => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    return mutate((cur) => {
      if (!demoWorkers.some((w) => w.id === input.assigneeId)) {
        return { next: cur, result: fail('Unknown worker.') };
      }
      if (cur.workOrders.some((w) => w.issueKey === input.issue.id && isActive(w))) {
        return { next: cur, result: fail('This issue already has an open work order.') };
      }
      const created = nowIso();
      const machStation = machines.find((m) => m.id === input.issue.machineId)?.station;
      const targetStation = input.issue.stationId ?? machStation ?? sessionRef.current?.stationId;

      const wo: WorkOrder = {
        id: `WO-${cur.workOrders.length + 1001}`,
        issueKey: input.issue.id,
        source: input.issue.source,
        machineId: input.issue.machineId,
        stationId: targetStation,
        title: input.issue.title,
        detail: input.issue.detail,
        action: input.issue.action,
        severity: input.issue.severity,
        priority: input.priority,
        assigneeId: input.assigneeId,
        assignedById: sessionRef.current!.userId,
        managerNote: input.note.trim(),
        status: 'assigned',
        createdAt: created,
        dueAt: input.dueAt,
        timeline: [
          event(
            'assigned',
            `Assigned to ${demoWorkers.find((w) => w.id === input.assigneeId)?.name}${input.note.trim() ? ` — "${input.note.trim()}"` : ''}`
          ),
        ],
      };
      return { next: { ...cur, workOrders: [...cur.workOrders, wo] }, result: ok };
    });
  };

  const reassignWorkOrder = (orderId: string, assigneeId: string): Result => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    return mutate((cur) => {
      const wo = cur.workOrders.find((w) => w.id === orderId);
      const worker = demoWorkers.find((w) => w.id === assigneeId);
      if (!wo || !worker) return { next: cur, result: fail('Work order or worker not found.') };
      if (wo.status === 'resolved') return { next: cur, result: fail('Order already resolved.') };
      return {
        next: patchOrder(cur, orderId, (w) => ({
          ...w,
          assigneeId,
          status: w.status === 'awaiting_confirmation' ? 'in_progress' : 'assigned',
          timeline: [...w.timeline, event('reassigned', `Reassigned to ${worker.name}`)],
        })),
        result: ok,
      };
    });
  };

  const resolveIssue = (cur: SharedState, key: string, impactINR?: number, orderId?: string): SharedState => {
    const base = cur.resolvedKeys.includes(key)
      ? cur
      : { ...cur, resolvedKeys: [...cur.resolvedKeys, key] };
    return orderId
      ? patchOrder(base, orderId, (w) => ({
          ...w,
          status: 'resolved',
          resolvedAt: nowIso(),
          impactINR,
        }))
      : base;
  };

  const impactFor = (cur: SharedState, wo: WorkOrder): number => {
    if (wo.source !== 'machine' || !wo.machineId) return 0;
    const m = demoMachines.find((x) => x.id === wo.machineId);
    return Math.round(
      (m?.downtimeHours ?? 0) *
        cur.businessInputs.productionRate *
        cur.businessInputs.contributionMargin
    );
  };

  const confirmResolved = (orderId: string): Result => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    return mutate((cur) => {
      const wo = cur.workOrders.find((w) => w.id === orderId);
      if (!wo) return { next: cur, result: fail('Work order not found.') };
      if (wo.status !== 'awaiting_confirmation') {
        return { next: cur, result: fail('The worker has not marked this as solved yet.') };
      }
      let next = resolveIssue(cur, wo.issueKey, impactFor(cur, wo), orderId);
      next = patchOrder(next, orderId, (w) => ({
        ...w,
        timeline: [...w.timeline, event('confirmed', 'Resolution confirmed')],
      }));
      return { next, result: ok };
    });
  };

  const reopenWorkOrder = (orderId: string, reason: string): Result => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    return mutate((cur) => {
      const wo = cur.workOrders.find((w) => w.id === orderId);
      if (!wo || wo.status !== 'awaiting_confirmation') {
        return { next: cur, result: fail('Only orders awaiting confirmation can be reopened.') };
      }
      return {
        next: patchOrder(cur, orderId, (w) => ({
          ...w,
          status: 'in_progress',
          timeline: [
            ...w.timeline,
            event('reopened', reason.trim() ? `Reopened: ${reason.trim()}` : 'Reopened by supervisor'),
          ],
        })),
        result: ok,
      };
    });
  };

  const resolveIssueDirectly = (issueKey: string): Result => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    return mutate((cur) => {
      const open = cur.workOrders.find((w) => w.issueKey === issueKey && isActive(w));
      let next = resolveIssue(cur, issueKey, open ? impactFor(cur, open) : undefined, open?.id);
      if (open) {
        next = patchOrder(next, open.id, (w) => ({
          ...w,
          timeline: [...w.timeline, event('confirmed', 'Supervisor resolved the issue directly')],
        }));
      }
      return { next, result: ok };
    });
  };

  const markNoticeRead = (noticeId: string) => {
    if (sessionRef.current?.role !== 'manager' && sessionRef.current?.role !== 'admin' && sessionRef.current?.role !== 'supervisor') return;
    mutate((cur) => ({
      next: { ...cur, notices: cur.notices.map((n) => (n.id === noticeId ? { ...n, read: true } : n)) },
      result: null,
    }));
  };

  const markAllNoticesRead = () => {
    if (sessionRef.current?.role !== 'manager' && sessionRef.current?.role !== 'admin' && sessionRef.current?.role !== 'supervisor') return;
    mutate((cur) => ({
      next: { ...cur, notices: cur.notices.map((n) => ({ ...n, read: true })) },
      result: null,
    }));
  };

  const updateEnergyReading: FactoryContextValue['updateEnergyReading'] = (machineId, patch) => {
    const denied = requireManagerOrSupervisor();
    if (denied) return denied;
    if (
      (patch.powerDraw !== undefined && !(patch.powerDraw >= 0)) ||
      (patch.referencePower !== undefined && !(patch.referencePower > 0))
    ) {
      return fail('Power must be >= 0 and reference power must be > 0.');
    }
    return mutate((cur) => ({
      next: {
        ...cur,
        energyReadings: cur.energyReadings.map((e) => (e.machineId === machineId ? { ...e, ...patch } : e)),
        resolvedKeys: cur.resolvedKeys.filter((k) => k !== issueKeys.energy(machineId)),
      },
      result: ok,
    }));
  };

  const updateStationThroughput = (stationId: string, throughput: number) => {
    if (requireManagerOrSupervisor()) return;
    mutate((cur) => ({
      next: {
        ...cur,
        stations: cur.stations.map((s) =>
          s.id === stationId ? { ...s, throughput: Math.max(0, throughput) } : s
        ),
        resolvedKeys: cur.resolvedKeys.filter((k) => !k.startsWith('station:')),
      },
      result: null,
    }));
  };

  const setReferenceStation = (stationId: string) => {
    if (requireManagerOrSupervisor()) return;
    mutate((cur) => ({ next: { ...cur, referenceStationId: stationId }, result: null }));
  };

  const setEnergyInputs = (v: SharedState['energyInputs']) => {
    if (requireManagerOrSupervisor()) return;
    mutate((cur) => ({ next: { ...cur, energyInputs: v }, result: null }));
  };

  const setBusinessInputs = (v: SharedState['businessInputs']) => {
    if (requireManagerOrSupervisor()) return;
    mutate((cur) => ({ next: { ...cur, businessInputs: v }, result: null }));
  };

  const resetDemo = () => {
    if (requireManagerOrSupervisor()) return;
    clearShared();
    const fresh = defaultShared();
    saveShared(fresh);
    setShared(fresh);
  };

  const withMyOrder = (
    orderId: string,
    allowed: WorkOrder['status'][],
    fn: (cur: SharedState, wo: WorkOrder) => SharedState
  ): Result => {
    const s = sessionRef.current;
    if (!s || s.role !== 'worker') return fail('Only maintenance engineers can perform this action.');
    return mutate((cur) => {
      const wo = cur.workOrders.find((w) => w.id === orderId);
      if (!wo || wo.assigneeId !== s.userId) {
        return { next: cur, result: fail('This task is not assigned to you.') };
      }
      if (!allowed.includes(wo.status)) {
        return { next: cur, result: fail('This action is not available for the task status.') };
      }
      return { next: fn(cur, wo), result: ok };
    });
  };

  const startWorkOrder = (orderId: string) =>
    withMyOrder(orderId, ['assigned'], (cur, wo) => {
      const next = patchOrder(cur, orderId, (w) => ({
        ...w,
        status: 'in_progress',
        timeline: [...w.timeline, event('started', 'Started working on this task')],
      }));
      return {
        ...next,
        notices: [
          ...next.notices,
          makeNotice(cur, wo, 'started', `${wo.title}`, `${userNameRef.current} started working on ${wo.machineId ?? `Station ${wo.stationId}`}.`),
        ],
      };
    });

  const addWorkOrderNote = (orderId: string, text: string) => {
    const t = text.trim();
    if (!t) return fail('Write a note first.');
    return withMyOrder(orderId, ['assigned', 'in_progress', 'awaiting_confirmation'], (cur, wo) => {
      const next = patchOrder(cur, orderId, (w) => ({
        ...w,
        timeline: [...w.timeline, event('note', t)],
      }));
      return { ...next, notices: [...next.notices, makeNotice(cur, wo, 'note', wo.title, t)] };
    });
  };

  const markSolved = (orderId: string, text: string) =>
    withMyOrder(orderId, ['assigned', 'in_progress'], (cur, wo) => {
      const t = text.trim() || 'Marked as solved.';
      const next = patchOrder(cur, orderId, (w) => ({
        ...w,
        status: 'awaiting_confirmation',
        timeline: [...w.timeline, event('solved', t)],
      }));
      return {
        ...next,
        notices: [...next.notices, makeNotice(cur, wo, 'solved', wo.title, t)],
      };
    });

  const value: FactoryContextValue = {
    machines,
    allMachines,
    stations,
    energyReadings,
    factory: demoFactory,
    workers,
    manager: demoManager,
    workOrders,
    notices,
    unreadNoticeCount,
    issues,
    criticalIssues,
    warningIssues,
    activeOrderForIssue,
    suggestWorker,
    hourlyDelayCost,
    createWorkOrder,
    reassignWorkOrder,
    confirmResolved,
    reopenWorkOrder,
    resolveIssueDirectly,
    refreshLiveData,
    markNoticeRead,
    markAllNoticesRead,
    updateEnergyReading,
    updateStationThroughput,
    setReferenceStation,
    resetDemo,
    startWorkOrder,
    addWorkOrderNote,
    markSolved,
    referenceStationId,
    referenceThroughput,
    bottleneckStation,
    throughputGap,
    relativeGap,
    summary,
    energyInputs,
    setEnergyInputs,
    businessInputs,
    setBusinessInputs,
  };

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactory() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactory must be used within FactoryProvider');
  return ctx;
}

export type { PageId };
export { topRiskFactor };
