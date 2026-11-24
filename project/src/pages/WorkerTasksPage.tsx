import { useState, useEffect } from 'react';
import {
  CheckCircle,
  ClipboardList,
  Play,
  Wrench,
  ShieldAlert,
  Activity,
  Cpu,
  Brain,
  Package,
  BookOpen,
  AlertTriangle,
  Send,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Bell
} from 'lucide-react';
import type { Machine, WorkOrder } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useFactory } from '@/context/FactoryContext';
import { useToast } from '@/components/Toast';
import { PriorityBadge, WorkOrderStatusBadge } from '@/components/WorkOrderBits';
import { formatDateTime, timeAgo } from '@/utils/format';
import { useTick } from '@/utils/useTick';
import { KnowledgeBase } from '@/components/KnowledgeBase';
import { fetchWorkOrdersApi, workerUpdateTaskApi, fetchNoticesApi, updateWorkerAvailabilityApi, fetchInventoryApi, type InventoryItem } from '@/utils/api';

export function WorkerTasksPage() {
  const { session, user, updateUserAvailability } = useAuth();
  const { machines } = useFactory();
  const toast = useToast();
  useTick();

  const [activeTab, setActiveTab] = useState<'orders' | 'knowledge'>('orders');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<boolean>(session?.available ?? true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const toggleAvailability = async () => {
    if (!session?.userId || togglingAvail) return;
    setTogglingAvail(true);
    const nextState = !available;
    try {
      await updateWorkerAvailabilityApi(session.userId, nextState);
      setAvailable(nextState);
      updateUserAvailability?.(nextState);
      toast(nextState ? 'Status set to AVAILABLE. Station Supervisor notified.' : 'Status set to UNAVAILABLE. Station Supervisor notified.');
    } catch (err: any) {
      toast(err?.message || 'Could not update availability. Please retry.', 'error');
    } finally {
      setTogglingAvail(false);
    }
  };

  // Modals for Worker Task Updates
  const [blockingOrder, setBlockingOrder] = useState<WorkOrder | null>(null);
  const [blockedReason, setBlockedReason] = useState('');

  const [resolvingOrder, setResolvingOrder] = useState<WorkOrder | null>(null);
  const [repairNotes, setRepairNotes] = useState('');
  const [lotoConfirmed, setLotoConfirmed] = useState(false);
  const [clearanceChecked, setClearanceChecked] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [partsUsed, setPartsUsed] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!resolvingOrder) return;
    fetchInventoryApi({ station: resolvingOrder.stationId }).then((data) => setInventoryItems(data.items)).catch(() => setInventoryItems([]));
  }, [resolvingOrder]);

  const loadWorkerData = async () => {
    setLoading(true);
    try {
      const allOrders = await fetchWorkOrdersApi().catch(() => []);
      // Filter orders assigned to this worker
      const myOrders = allOrders.filter(
        (o) => o.assigneeId === session?.userId || o.assigneeId === user?.id
      );
      setOrders(myOrders);

      const notes = await fetchNoticesApi().catch(() => []);
      setNotices(notes);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerData();
  }, [session]);

  const handleUpdateStatus = async (
    orderId: string,
    action: 'accept' | 'reject' | 'start' | 'block' | 'resolve',
    note?: string,
    blockReason?: string,
    repNotes?: string,
    usedParts: Array<{ item_id: string; quantity: number }> = []
  ): Promise<boolean> => {
    try {
      await workerUpdateTaskApi(orderId, action, note, blockReason, repNotes, usedParts);
      toast(`Task status updated to: ${action.toUpperCase()}`);
      await loadWorkerData();
      return true;
    } catch (err: any) {
      toast(err?.message || 'Failed to update task status', 'error');
      return false;
    }
  };

  const submitBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingOrder || !blockedReason.trim()) return;
    if (!await handleUpdateStatus(blockingOrder.id, 'block', undefined, blockedReason.trim())) return;
    setBlockingOrder(null);
    setBlockedReason('');
  };

  const submitResolved = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingOrder || !repairNotes.trim()) return;
    if (!lotoConfirmed) {
      toast('Please confirm LOTO removal & test run safety.', 'error');
      return;
    }
    const updated = await handleUpdateStatus(
      resolvingOrder.id,
      'resolve',
      undefined,
      undefined,
      `${repairNotes.trim()} (Clearance checked: ${clearanceChecked ? 'Yes' : 'N/A'}, LOTO verified removed).`,
      Object.entries(partsUsed).filter(([, quantity]) => quantity > 0).map(([item_id, quantity]) => ({ item_id, quantity }))
    );
    if (!updated) return;
    setResolvingOrder(null);
    setRepairNotes('');
    setLotoConfirmed(false);
    setClearanceChecked(false);
    setPartsUsed({});
  };

  const pendingCount = orders.filter((o) => o.status !== 'closed' && o.status !== 'resolved' && o.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Maintenance Engineer Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong>{user?.name}</strong> • Station {session?.stationId || 'A'} • {session?.specialization || 'Mechanical Maintenance'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList size={14} className="text-amber-600" />
              <span>My Work Orders ({pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen size={14} className="text-amber-600" />
              <span>Knowledge Base</span>
            </button>
          </div>

          <button
            onClick={loadWorkerData}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs shadow-sm"
            title="Refresh assignments"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Worker Availability Notification Status Bar */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all ${
        available
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-rose-50/70 border-rose-200 text-rose-950'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${available ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <div className="text-xs">
            <span className="font-bold">
              {available ? 'Status: AVAILABLE for assignments' : 'Status: UNAVAILABLE / OFF-DUTY'}
            </span>
            <span className="text-slate-600 block sm:inline sm:ml-2 text-[11px]">
              {available
                ? 'Your Station Supervisor can assign pending machine work orders to you.'
                : 'Your Station Supervisor has been notified that you are off-duty / on-leave.'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleAvailability}
          disabled={togglingAvail}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            available
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
          }`}
        >
          {available ? 'Notify Supervisor: Go Off-Duty' : 'Notify Supervisor: Mark Available'}
        </button>
      </div>

      {/* Notifications Alert Strip */}
      {notices.length > 0 && !notices[0].read && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Bell size={16} className="text-amber-600 shrink-0" />
            <div>
              <strong>{notices[0].title}</strong>: {notices[0].message}
            </div>
          </div>
          <span className="text-[10px] text-amber-700 whitespace-nowrap">{timeAgo(notices[0].createdAt)}</span>
        </div>
      )}

      {/* TAB 1: MY WORK ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <ClipboardList size={32} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 mt-3">No Work Orders Assigned</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You are currently all caught up! New repair orders assigned by your station supervisor will appear here.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const machine = machines.find((m) => m.id === order.machineId);
              return (
                <WorkerOrderCard
                  key={order.id}
                  order={order}
                  machine={machine}
                  onAccept={() => handleUpdateStatus(order.id, 'accept')}
                  onReject={() => handleUpdateStatus(order.id, 'reject')}
                  onStart={() => handleUpdateStatus(order.id, 'start')}
                  onBlock={() => {
                    setBlockingOrder(order);
                    setBlockedReason('');
                  }}
                  onResume={() => handleUpdateStatus(order.id, 'start')}
                  onResolve={() => {
                    setResolvingOrder(order);
                    setRepairNotes(`Inspected and completed repair for ${order.machineId || 'equipment'}. Replaced damaged components per SOP.`);
                    setLotoConfirmed(false);
                    setClearanceChecked(true);
                  }}
                />
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-3">
          <div className="pb-1">
            <h2 className="text-base font-bold text-slate-900">Standard Maintenance Knowledge Base</h2>
            <p className="text-xs text-slate-500">
              Field troubleshooting guides, diagnostic steps, SOP corrective actions, and LOTO safety protocols.
            </p>
          </div>
          <KnowledgeBase />
        </div>
      )}

      {/* ── MODAL: Report Task Blocked ── */}
      {blockingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={18} />
                <span>Report Task Blocked</span>
              </h3>
              <button
                onClick={() => setBlockingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reporting a block will immediately notify your station supervisor and record the reason in the plant work order log.
            </p>

            <form onSubmit={submitBlocked} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Block *
                </label>
                <textarea
                  rows={3}
                  required
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="e.g. Awaiting delivery of replacement 6205 deep-groove bearing from central stores. Electrical isolation switch key locked."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBlockingOrder(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Blocked
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Complete & Submit for Verification ── */}
      {resolvingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                <span>Submit Repair for Supervisor Verification</span>
              </h3>
              <button
                onClick={() => setResolvingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When submitted, only readings outside this machine's limits are repaired and the machine status updates immediately. Your supervisor then verifies the repair and closes the work order; rejected repairs restore the original fault readings.
            </p>

            <form onSubmit={submitResolved} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Repair Notes & Actions Taken *
                </label>
                <textarea
                  rows={3}
                  required
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Detail parts replaced, grease volume applied, clearance measurements, and test spin observations..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="space-y-2 border-b border-slate-200 pb-3">
                  <p className="font-bold text-slate-700">Parts used (optional)</p>
                  {inventoryItems.filter((item) => item.stockLevel > 0 && (!item.compatibleMachines.length || item.compatibleMachines.includes(resolvingOrder.machineId || ''))).map((item) => (
                    <label key={item.id} className="flex items-center justify-between gap-3">
                      <span>{item.name} <span className="text-slate-500">({item.stockLevel} available)</span></span>
                      <input aria-label={`Quantity of ${item.name} used`} type="number" min={0} max={item.stockLevel} value={partsUsed[item.id] || ''} onChange={(e) => setPartsUsed((current) => ({ ...current, [item.id]: Math.min(item.stockLevel, Math.max(0, Number(e.target.value) || 0)) }))} className="w-16 rounded border border-slate-300 px-2 py-1" />
                    </label>
                  ))}
                  {!inventoryItems.some((item) => item.stockLevel > 0 && (!item.compatibleMachines.length || item.compatibleMachines.includes(resolvingOrder.machineId || ''))) && <p className="text-slate-500">No compatible inventory items are currently available.</p>}
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearanceChecked}
                    onChange={(e) => setClearanceChecked(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mechanical clearances verified within ±0.05 mm baseline tolerance.</span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer font-bold text-rose-800">
                  <input
                    type="checkbox"
                    checked={lotoConfirmed}
                    onChange={(e) => setLotoConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>LOTO removal protocol completed, safety guards reinstalled, and area cleared for test run. *</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingOrder(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Submit for Supervisor Verification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkerOrderCard({
  order,
  machine,
  onAccept,
  onReject,
  onStart,
  onBlock,
  onResume,
  onResolve,
}: {
  order: WorkOrder;
  machine?: Machine;
  onAccept: () => void;
  onReject: () => void;
  onStart: () => void;
  onBlock: () => void;
  onResume: () => void;
  onResolve: () => void;
}) {
  const isPendingAccept = order.status === 'assigned_to_worker' || order.status === 'assigned';
  const isAccepted = order.status === 'accepted';
  const isInProgress = order.status === 'in_progress';
  const isBlocked = order.status === 'blocked';
  const isAwaitingVerification = order.status === 'awaiting_verification' || order.status === 'awaiting_confirmation';
  const isClosed = order.status === 'closed' || order.status === 'resolved' || order.status === 'cancelled';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-bold text-slate-500">{order.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white">
              Station {order.stationId || 'A'}
            </span>
            <PriorityBadge priority={order.priority} />
            <WorkOrderStatusBadge status={order.status} />
          </div>
          <h2 className="text-base font-bold text-slate-900">{order.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Assigned by: {order.assignedById || 'Supervisor'}</p>
        </div>

        {/* Live Machine Status Widget if linked */}
        {machine && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4 text-xs shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Machine</p>
              <p className="font-bold text-slate-800">{machine.name} ({machine.id})</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Telemetry</p>
              <p className="font-mono text-slate-700">{machine.temperature}°C • {machine.vibration} mm/s</p>
            </div>
          </div>
        )}
      </div>

      {/* Problem & AI Diagnosis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Problem Description & AI Diagnosis
          </span>
          <p className="text-slate-700 leading-relaxed">{order.detail}</p>
          <p className="text-slate-600 font-medium mt-1">Recommended Action: {order.action}</p>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-0.5">
              <Package size={13} className="text-amber-500" />
              <span>Required Spare Parts</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              {order.spareParts || 'Standard PM kit, lubrication grease, replacement seals.'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-0.5">
              <ShieldAlert size={13} className="text-rose-500" />
              <span>Mandatory Safety Instructions (LOTO)</span>
            </div>
            <p className="text-rose-900 text-[11px] font-medium whitespace-pre-line">
              {order.safetyInstructions || 'Strict Lockout/Tagout on 415V feeder panel. Zero-energy verification.'}
            </p>
          </div>
        </div>
      </div>

      {/* Blocked or Worker notes if recorded */}
      {order.blockedReason && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs">
          <span className="font-bold text-rose-800">Current Block Reason: </span>
          <span className="text-rose-950">{order.blockedReason}</span>
        </div>
      )}

      {order.workerNotes && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
          <span className="font-bold text-emerald-800">Submitted Repair Notes: </span>
          <span className="text-emerald-950">{order.workerNotes}</span>
        </div>
      )}

      {/* Interactive Status Controls for Worker */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
        <div className="text-xs text-slate-500 font-medium">
          {isPendingAccept && 'Please review details and accept or reject this assignment.'}
          {isAccepted && 'Ready to begin repair work. Apply LOTO before starting.'}
          {isInProgress && 'Repair in progress. Report blocked if parts needed, or complete repair.'}
          {isBlocked && 'Work order currently on hold. Click Resume once unblocked.'}
          {isAwaitingVerification && 'Repair submitted! Waiting for station supervisor verification and signoff.'}
          {isClosed && 'Work order officially closed and verified by supervisor.'}
        </div>

        <div className="flex items-center gap-2">
          {/* Step 6: Accept or Reject */}
          {isPendingAccept && (
            <>
              <button
                onClick={onReject}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <XCircle size={14} className="text-slate-500" />
                <span>Decline / Reject</span>
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Accept Assignment</span>
              </button>
            </>
          )}

          {/* Start Repair */}
          {isAccepted && (
            <button
              onClick={onStart}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Play size={14} />
              <span>Start Repair (Apply LOTO)</span>
            </button>
          )}

          {/* In Progress: Block or Complete */}
          {isInProgress && (
            <>
              <button
                onClick={onBlock}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <AlertTriangle size={14} />
                <span>Report Blocked</span>
              </button>
              <button
                onClick={onResolve}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Mark Resolved (Send for Verification)</span>
              </button>
            </>
          )}

          {/* Blocked: Resume */}
          {isBlocked && (
            <button
              onClick={onResume}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Play size={14} />
              <span>Resume Repair Work</span>
            </button>
          )}

          {isAwaitingVerification && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending Supervisor Verification</span>
            </span>
          )}

          {isClosed && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>Officially Closed</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Timeline({ order }: { order: WorkOrder }) {
  if (!order.timeline || order.timeline.length === 0) {
    return <p className="text-xs text-slate-400 italic">No timeline events recorded yet.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-3 pt-1">
      {order.timeline.map((ev, idx) => (
        <li key={idx} className="ml-4">
          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-slate-400 border border-white" />
          <p className="text-xs font-semibold text-slate-800">{ev.byName || ev.by}: {ev.message}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(ev.at)}</p>
        </li>
      ))}
    </ol>
  );
}
