import { UserPlus, Clock } from 'lucide-react';
import type { CriticalIssue, Priority, WorkOrder, WorkOrderStatus } from '@/types';
import { useFactory } from '@/context/FactoryContext';
import { formatDue } from '@/utils/format';

export const statusMeta: Record<WorkOrderStatus, { label: string; cls: string }> = {
  pending_admin: { label: 'Pending Admin Approval', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  assigned_to_supervisor: { label: 'Assigned to Supervisor', cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  assigned_to_worker: { label: 'Assigned to Worker', cls: 'bg-purple-50 text-purple-800 border-purple-300' },
  accepted: { label: 'Worker Accepted', cls: 'bg-blue-50 text-blue-800 border-blue-300' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
  blocked: { label: 'Blocked / Hold', cls: 'bg-rose-50 text-rose-800 border-rose-300 font-bold' },
  awaiting_verification: { label: 'Awaiting Verification', cls: 'bg-amber-100 text-amber-900 border-amber-400 font-semibold' },
  closed: { label: 'Verified & Closed', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold' },
  cancelled: { label: 'Cancelled (False Alert)', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  // Legacy mappings
  assigned: { label: 'Assigned', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  awaiting_confirmation: { label: 'Awaiting Verification', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const m = statusMeta[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cls =
    priority === 'High'
      ? 'bg-red-50 text-red-700 border-red-200'
      : priority === 'Medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{priority}</span>;
}

export function DueLabel({ order }: { order: WorkOrder }) {
  if (order.status === 'resolved' || order.status === 'closed' || order.status === 'cancelled') return null;
  const due = formatDue(order.dueAt, order.createdAt, order.priority);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${due.overdue ? 'text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded' : 'text-slate-500'}`}>
      <Clock size={12} className={due.overdue ? 'text-red-600' : 'text-slate-400'} /> {due.text}
    </span>
  );
}

export function AssignControl({
  issue,
  onAssign,
  size = 'md',
}: {
  issue: CriticalIssue | undefined;
  onAssign: (issue: CriticalIssue) => void;
  size?: 'sm' | 'md';
}) {
  const { activeOrderForIssue, workers } = useFactory();
  if (!issue) return null;
  const order = activeOrderForIssue(issue.id);
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm';

  if (order) {
    const w = workers.find((x) => x.id === order.assigneeId);
    const m = statusMeta[order.status] || { label: order.status };
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 ${pad} font-medium text-slate-700 whitespace-nowrap`}
        title={`${w?.name || 'Pending assignment'} · ${m.label}`}
      >
        <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-semibold flex items-center justify-center">
          {(w?.name || 'IQ').split(' ').map((p) => p[0]).join('')}
        </span>
        {w ? w.name.split(' ')[0] : 'Open Order'}
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{m.label}</span>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAssign(issue);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-sm transition-colors whitespace-nowrap ${pad}`}
    >
      <UserPlus size={size === 'sm' ? 13 : 15} /> Assign Order
    </button>
  );
}
