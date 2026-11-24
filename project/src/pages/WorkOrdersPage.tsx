import { useMemo, useState, useEffect } from 'react';
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Wrench,
  Package,
  ShieldAlert,
  Send,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Boxes,
  UserX
} from 'lucide-react';
import type { WorkOrder, WorkOrderStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useFactory } from '@/context/FactoryContext';
import { useToast } from '@/components/Toast';
import { PageHeader, SectionCard } from '@/components/ui';
import { DueLabel, PriorityBadge, WorkOrderStatusBadge } from '@/components/WorkOrderBits';
import { Timeline } from '@/pages/WorkerTasksPage';
import { formatDateTime, formatINR } from '@/utils/format';
import { useTick } from '@/utils/useTick';
import {
  fetchWorkOrdersApi,
  fetchSupervisorsApi,
  fetchWorkersApi,
  adminAssignSupervisorApi,
  supervisorAssignWorkerApi,
  supervisorVerifyCloseApi,
  autoDispatchWorkOrderApi,
  dispatchStationQueueApi,
  unassignWorkOrderApi
} from '@/utils/api';

const ALL_STATUS_FILTERS: { id: WorkOrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending_admin', label: 'Pending Admin' },
  { id: 'assigned_to_supervisor', label: 'At Supervisor' },
  { id: 'assigned_to_worker', label: 'Assigned to Worker' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'awaiting_verification', label: 'Awaiting Verification' },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function WorkOrdersPage() {
  const { session } = useAuth();
  const toast = useToast();
  useTick();

  const isAdmin = session?.role === 'admin' || session?.role === 'manager';
  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = session?.stationId || 'A';

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Workflow Action Modals
  const [assigningAdminOrder, setAssigningAdminOrder] = useState<WorkOrder | null>(null);
  const [selectedSupId, setSelectedSupId] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const [assigningWorkerOrder, setAssigningWorkerOrder] = useState<WorkOrder | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [supervisorInstruction, setSupervisorInstruction] = useState('');

  const [verifyingOrder, setVerifyingOrder] = useState<WorkOrder | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [inspectionPassed, setInspectionPassed] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const ords = await fetchWorkOrdersApi().catch(() => []);
      setOrders(ords);

      if (isAdmin) {
        const sups = await fetchSupervisorsApi().catch(() => []);
        setSupervisors(sups);
      }

      const wkrs = await fetchWorkersApi(isSupervisor ? supervisorStation : undefined).catch(() => []);
      setWorkers(wkrs);
    } catch {
      // Graceful offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Scoped filtering: Supervisors only see orders for their station
  const scopedOrders = useMemo(() => {
    let list = orders;
    if (isSupervisor) {
      list = list.filter((o) => o.stationId === supervisorStation);
    }
    return list;
  }, [orders, isSupervisor, supervisorStation]);

  const filteredOrders = useMemo(() => {
    return scopedOrders.filter((o) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_progress' && (o.status === 'in_progress' || o.status === 'accepted')) {
          // match
        } else if (statusFilter === 'awaiting_verification' && (o.status === 'awaiting_verification' || o.status === 'awaiting_confirmation')) {
          // match
        } else if (statusFilter === 'closed' && (o.status === 'closed' || o.status === 'resolved')) {
          // match
        } else if (o.status !== statusFilter) {
          return false;
        }
      }

      // Station filter (admin only)
      if (isAdmin && stationFilter !== 'all' && o.stationId !== stationFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = o.title.toLowerCase().includes(q);
        const matchesDetail = o.detail.toLowerCase().includes(q);
        const matchesMachine = (o.machineId || '').toLowerCase().includes(q);
        const matchesId = o.id.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDetail && !matchesMachine && !matchesId) return false;
      }

      return true;
    });
  }, [scopedOrders, statusFilter, stationFilter, searchQuery, isAdmin]);

  // Step 3 in Workflow: Admin assigns to station supervisor
  const handleAdminAssignSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAdminOrder || !selectedSupId) return;
    try {
      await adminAssignSupervisorApi(assigningAdminOrder.id, selectedSupId, adminNote);
      toast(`Work order ${assigningAdminOrder.id} approved & assigned to Station Supervisor.`);
      setAssigningAdminOrder(null);
      setAdminNote('');
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Failed to assign supervisor', 'error');
    }
  };

  // Step 4 in Workflow: Supervisor assigns to worker
  const handleSupervisorAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningWorkerOrder || !selectedWorkerId) return;
    try {
      await supervisorAssignWorkerApi(assigningWorkerOrder.id, selectedWorkerId, supervisorInstruction);
      toast(`Work order assigned to maintenance worker.`);
      setAssigningWorkerOrder(null);
      setSupervisorInstruction('');
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Failed to assign worker', 'error');
    }
  };

  // Steps 9 & 10 in Workflow: Supervisor verifies and closes
  const handleSupervisorVerifyClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingOrder || !verifyNotes.trim()) {
      toast('Please enter verification notes.', 'error');
      return;
    }
    try {
      await supervisorVerifyCloseApi(verifyingOrder.id, inspectionPassed, verifyNotes.trim());
      if (inspectionPassed) {
        toast(`Work order ${verifyingOrder.id} successfully verified & closed!`);
      } else {
        toast(`Verification rejected. Work order returned to worker for rework.`, 'error');
      }
      setVerifyingOrder(null);
      setVerifyNotes('');
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Verification submission failed', 'error');
    }
  };

  const [autoDispatchingId, setAutoDispatchingId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [dispatchingQueue, setDispatchingQueue] = useState(false);

  const handleUnassignWorker = async (orderId: string) => {
    try {
      setUnassigningId(orderId);
      const res = await unassignWorkOrderApi(orderId);
      toast(res.message || 'Worker unassigned. Order returned to station queue.');
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Failed to unassign worker', 'error');
    } finally {
      setUnassigningId(null);
    }
  };

  const handleAutoDispatch = async (orderId: string) => {
    try {
      setAutoDispatchingId(orderId);
      const res = await autoDispatchWorkOrderApi(orderId);
      if (res.status === 'blocked') {
        toast(`⚠️ Task Held: ${res.missingPart?.name || 'Spare part'} is OUT OF STOCK. Worker freed for actionable tasks!`, 'error');
      } else {
        toast(`⚡ Auto-Assigned to ${res.assigneeName} (${res.specialization})! Allocated: ${res.allocatedPart?.name || 'Standard kit'}.`);
      }
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Auto-dispatch failed', 'error');
    } finally {
      setAutoDispatchingId(null);
    }
  };

  const handleDispatchStationQueue = async () => {
    try {
      setDispatchingQueue(true);
      const res = await dispatchStationQueueApi(isSupervisor ? supervisorStation : undefined);
      toast(`⚡ Queue Dispatched: ${res.dispatchedCount} tasks assigned, ${res.blockedStockoutCount} held on parts stockout.`);
      await loadData();
    } catch (err: any) {
      toast(err?.message || 'Queue dispatch failed', 'error');
    } finally {
      setDispatchingQueue(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <PageHeader
            title={isSupervisor ? `Station ${supervisorStation} Work Orders` : 'Factory Work Order Management'}
            description={
              isSupervisor
                ? `Manage incoming repairs for Station ${supervisorStation}, dispatch specialized workers, and verify closed orders.`
                : 'Full factory work order pipeline: review AI alerts, approve and assign to station supervisors.'
            }
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDispatchStationQueue}
            disabled={dispatchingQueue}
            className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            title="Auto-dispatch pending tasks by priority; skips out-of-stock tasks to keep technicians active on actionable repairs"
          >
            <Sparkles size={14} className={dispatchingQueue ? 'animate-spin' : ''} />
            <span>{dispatchingQueue ? 'Dispatching...' : '⚡ Smart Queue Dispatch'}</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search work orders by machine, title, or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Station Filter (Admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Stations</option>
              <option value="A">Station A</option>
              <option value="B">Station B</option>
              <option value="C">Station C</option>
              <option value="D">Station D</option>
            </select>
          </div>
        )}
      </div>

      {/* Status Badges Filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto w-fit max-w-full border border-slate-200">
        {ALL_STATUS_FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? scopedOrders.length
              : scopedOrders.filter((o) => {
                  if (f.id === 'in_progress') return o.status === 'in_progress' || o.status === 'accepted';
                  if (f.id === 'awaiting_verification') return o.status === 'awaiting_verification' || o.status === 'awaiting_confirmation';
                  if (f.id === 'closed') return o.status === 'closed' || o.status === 'resolved';
                  return o.status === f.id;
                }).length;

          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === f.id ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <SectionCard
        title="Work Order Pipeline"
        subtitle={`${filteredOrders.length} of ${scopedOrders.length} active orders shown`}
      >
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 mt-3">No work orders match current filters</p>
            <p className="text-xs text-slate-400 mt-1">
              AI detects machine anomalies continuously and will automatically generate work orders here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((order) => (
              <DetailedOrderCard
                key={order.id}
                order={order}
                isAdmin={isAdmin}
                isSupervisor={isSupervisor}
                workers={workers}
                onAdminAssign={() => {
                  setAssigningAdminOrder(order);
                  setSelectedSupId(supervisors.find((s) => s.stationId === order.stationId)?.id || supervisors[0]?.id || '');
                }}
                onSupervisorAssign={() => {
                  setAssigningWorkerOrder(order);
                  const qualifiedWorker = workers.find((w) => w.stationId === order.stationId && w.available);
                  setSelectedWorkerId(qualifiedWorker?.id || workers[0]?.id || '');
                }}
                onSupervisorVerify={() => {
                  setVerifyingOrder(order);
                  setVerifyNotes(`Physical inspection of ${order.machineId || 'machine'} completed. Telemetry and vibration verified within baseline limits.`);
                  setInspectionPassed(true);
                }}
                onAutoDispatch={() => handleAutoDispatch(order.id)}
                isAutoDispatching={autoDispatchingId === order.id}
                onUnassign={() => handleUnassignWorker(order.id)}
                isUnassigning={unassigningId === order.id}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── MODAL: Admin Approves & Assigns to Station Supervisor ── */}
      {assigningAdminOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="text-amber-500" size={20} />
                <span>Approve & Assign to Station Supervisor</span>
              </h3>
              <button
                onClick={() => setAssigningAdminOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">{assigningAdminOrder.title}</p>
              <p className="text-slate-600">{assigningAdminOrder.detail}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-semibold">
                <span>Machine: <strong>{assigningAdminOrder.machineId || 'N/A'}</strong></span>
                <span>Station: <strong>Station {assigningAdminOrder.stationId || 'A'}</strong></span>
                <span>Priority: <strong>{assigningAdminOrder.priority}</strong></span>
              </div>
            </div>

            <form onSubmit={handleAdminAssignSupervisor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign to Station Supervisor *
                </label>
                <select
                  required
                  value={selectedSupId}
                  onChange={(e) => setSelectedSupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.stationName || `Station ${s.stationId}`}) — @{s.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Manager Instructions / Priority Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Approved. Priority maintenance required before end of first shift. Verify coupling alignment."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningAdminOrder(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Approve & Dispatch Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Supervisor Assigns to Qualified Worker ── */}
      {assigningWorkerOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="text-sky-600" size={20} />
                <span>Assign Task to Station Worker</span>
              </h3>
              <button
                onClick={() => setAssigningWorkerOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">{assigningWorkerOrder.title}</p>
              <p className="text-slate-600 text-[11px]">{assigningWorkerOrder.action}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                <span>Specialization Needed: <strong className="text-sky-700">{assigningWorkerOrder.specializationRequired || 'General Maintenance'}</strong></span>
                <span>Station: <strong>Station {assigningWorkerOrder.stationId}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSupervisorAssignWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Qualified Factory Worker *
                </label>
                <select
                  required
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  {workers
                    .filter((w) => !assigningWorkerOrder.stationId || w.stationId === assigningWorkerOrder.stationId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {w.specialization} ({w.available ? 'Ready / Available' : 'Off-Duty'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supervisor Instructions & SOP Reminder
                </label>
                <textarea
                  rows={3}
                  value={supervisorInstruction}
                  onChange={(e) => setSupervisorInstruction(e.target.value)}
                  placeholder="e.g. Ensure strict LOTO compliance before opening coupling guard. Record pre and post vibration readings."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningWorkerOrder(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Assign to Worker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Supervisor Verifies Completed Work & Officially Closes ── */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span>Verify Completed Repair & Sign-Off</span>
              </h3>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs space-y-2">
              <p className="font-bold text-slate-900">{verifyingOrder.title} ({verifyingOrder.id})</p>
              <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Worker Reported Notes:</span>
                <p className="text-xs text-slate-800">{verifyingOrder.workerNotes || 'Repair complete per standard SOP.'}</p>
              </div>
            </div>

            <form onSubmit={handleSupervisorVerifyClose} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Inspection Verdict
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectionPassed(true)}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      inspectionPassed
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Pass Inspection & Close Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionPassed(false)}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      !inspectionPassed
                        ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle size={16} className="text-red-600" />
                    <span>Reject & Require Rework</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supervisor Verification Audit Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Record verification inspection details, clearance checks, and signoff notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 ${
                    inspectionPassed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>{inspectionPassed ? 'Officially Close Work Order' : 'Submit Rework Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedOrderCard({
  order,
  isAdmin,
  isSupervisor,
  workers,
  onAdminAssign,
  onSupervisorAssign,
  onSupervisorVerify,
  onAutoDispatch,
  isAutoDispatching,
  onUnassign,
  isUnassigning,
}: {
  order: WorkOrder;
  isAdmin: boolean;
  isSupervisor: boolean;
  workers: any[];
  onAdminAssign: () => void;
  onSupervisorAssign: () => void;
  onSupervisorVerify: () => void;
  onAutoDispatch?: () => void;
  isAutoDispatching?: boolean;
  onUnassign?: () => void;
  isUnassigning?: boolean;
}) {
  const [expanded, setExpanded] = useState(
    order.status === 'awaiting_verification' || order.status === 'pending_admin'
  );
  const assignedWorker = workers.find((w) => w.id === order.assigneeId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300">
      {/* Header Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-start gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
            order.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[11px] font-mono font-bold text-slate-500">{order.id}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
              Station {order.stationId || 'A'}
            </span>
            {order.machineId && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {order.machineId}
              </span>
            )}
            <PriorityBadge priority={order.priority} />
            <WorkOrderStatusBadge status={order.status} />
          </div>

          <h3 className="text-sm font-bold text-slate-900 leading-snug">{order.title}</h3>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
            {assignedWorker ? (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Wrench size={13} className="text-slate-400" />
                <span>Worker: {assignedWorker.name} ({assignedWorker.specialization})</span>
              </span>
            ) : (
              <span className="text-slate-400 italic">No worker assigned yet</span>
            )}
            <DueLabel order={order} />
          </div>
        </div>

        {/* Action Button right in header when pending */}
        <div className="flex items-center gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
          {/* ⚡ One-Click AI Auto-Dispatch Button */}
          {(order.status === 'pending_admin' || order.status === 'assigned_to_supervisor') && onAutoDispatch && (
            <button
              onClick={onAutoDispatch}
              disabled={isAutoDispatching}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:from-amber-600 text-slate-950 text-xs font-black rounded-lg shadow-sm flex items-center gap-1 border border-amber-300 transition-all disabled:opacity-50 cursor-pointer"
              title="Intelligently auto-match best available worker and allocate spare parts"
            >
              <Sparkles size={12} className={isAutoDispatching ? 'animate-spin' : ''} />
              <span>{isAutoDispatching ? 'Matching...' : '⚡ Auto-Assign (AI)'}</span>
            </button>
          )}

          {isAdmin && order.status === 'pending_admin' && (
            <button
              onClick={onAdminAssign}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Send size={12} />
              <span>Manual Assign</span>
            </button>
          )}

          {isSupervisor && order.status === 'assigned_to_supervisor' && (
            <button
              onClick={onSupervisorAssign}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <UserCheck size={12} />
              <span>Manual Assign</span>
            </button>
          )}

          {isSupervisor && order.status === 'awaiting_verification' && (
            <button
              onClick={onSupervisorVerify}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 size={12} />
              <span>Verify & Close</span>
            </button>
          )}

          {(isAdmin || isSupervisor) && order.assigneeId && (order.status === 'assigned_to_worker' || order.status === 'accepted' || order.status === 'in_progress' || order.status === 'blocked') && onUnassign && (
            <button
              onClick={onUnassign}
              disabled={isUnassigning}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Unassign current worker and return order to station queue"
            >
              <UserX size={12} className={isUnassigning ? 'animate-spin' : ''} />
              <span>{isUnassigning ? 'Unassigning...' : 'Unassign'}</span>
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Accordion Details */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Machine Problem Detail & AI Diagnosis
              </span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{order.detail}</p>
              <p className="text-xs text-slate-600 font-medium mt-1">Action: {order.action}</p>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold mb-1">
                  <Package size={14} className="text-amber-500" />
                  <span>Required Spare Parts</span>
                </div>
                <p className="text-xs text-slate-600">
                  {order.spareParts || 'Standard PM kit, lubrication grease, replacement gaskets.'}
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold mb-1">
                  <ShieldAlert size={14} className="text-red-500" />
                  <span>Mandatory Safety & LOTO Instructions</span>
                </div>
                <p className="text-xs text-slate-600">
                  {order.safetyInstructions || 'Strict Lockout/Tagout on 415V feeder panel. Zero-energy verification.'}
                </p>
              </div>
            </div>
          </div>

          {/* Worker notes & Blocked reason if any */}
          {order.workerNotes && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Worker Completion Notes
              </span>
              <p className="text-xs text-emerald-950 mt-0.5">{order.workerNotes}</p>
            </div>
          )}

          {order.blockedReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                Work Order Blocked Reason
              </span>
              <p className="text-xs text-rose-950 mt-0.5">{order.blockedReason}</p>
            </div>
          )}

          {order.verificationNotes && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Supervisor Verification Audit Notes
              </span>
              <p className="text-xs text-sky-950 mt-0.5">{order.verificationNotes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="pt-2 border-t border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Maintenance Timeline History
            </span>
            <Timeline order={order} />
          </div>

          {order.resolvedAt && (
            <p className="text-[11px] text-emerald-700 font-semibold pt-1">
              Officially verified & closed on {formatDateTime(order.resolvedAt)}
              {order.impactINR ? ` • Protected risk ≈ ${formatINR(order.impactINR)}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
