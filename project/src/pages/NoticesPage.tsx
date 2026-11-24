import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ListFilter,
  MapPin,
  MessageSquare,
  Play,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  Wrench,
} from 'lucide-react';
import type { ManagerPageId, Notice, WorkOrder, WorkOrderStatus } from '@/types';
import { useFactory } from '@/context/FactoryContext';
import { PageHeader } from '@/components/ui';
import { timeAgo } from '@/utils/format';
import { useTick } from '@/utils/useTick';
import { markNoticeReadApi } from '@/utils/api';

type InboxTab = 'action' | 'progress' | 'completed' | 'all';
type InboxBucket = Exclude<InboxTab, 'all'>;
type DateRange = 'any' | 'today' | '7d' | '30d';

interface WorkOrderThread {
  id: string;
  order?: WorkOrder;
  notices: Notice[];
  latestNotice?: Notice;
  createdAt: string;
  bucket: InboxBucket;
}

const tabs: { id: InboxTab; label: string }[] = [
  { id: 'action', label: 'Needs action' },
  { id: 'progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

const noticeMeta: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  critical_escalation: { icon: ShieldAlert, label: 'Critical escalation', color: 'text-red-600 bg-red-50' },
  critical_assignment: { icon: AlertTriangle, label: 'Urgent assignment', color: 'text-rose-600 bg-rose-50' },
  assigned_to_supervisor: { icon: Send, label: 'Supervisor assignment', color: 'text-sky-700 bg-sky-50' },
  assigned_to_worker: { icon: Wrench, label: 'Worker assignment', color: 'text-violet-700 bg-violet-50' },
  assigned: { icon: Send, label: 'Task assigned', color: 'text-amber-700 bg-amber-50' },
  task_blocked: { icon: AlertTriangle, label: 'Task blocked', color: 'text-rose-700 bg-rose-50' },
  reassignment_needed: { icon: AlertTriangle, label: 'Reassignment needed', color: 'text-amber-700 bg-amber-50' },
  awaiting_verification: { icon: CheckCircle2, label: 'Ready for verification', color: 'text-amber-800 bg-amber-100' },
  closed: { icon: CheckCircle2, label: 'Work order closed', color: 'text-emerald-700 bg-emerald-50' },
  rework_required: { icon: AlertTriangle, label: 'Rework required', color: 'text-red-700 bg-red-50' },
  started: { icon: Play, label: 'Work started', color: 'text-blue-700 bg-blue-50' },
  in_progress: { icon: Play, label: 'Work in progress', color: 'text-blue-700 bg-blue-50' },
  note: { icon: MessageSquare, label: 'Work order update', color: 'text-slate-600 bg-slate-100' },
  solved: { icon: CheckCircle2, label: 'Repair reported complete', color: 'text-emerald-700 bg-emerald-50' },
};

const statusLabels: Partial<Record<WorkOrderStatus, string>> = {
  pending_admin: 'Needs manager assignment',
  assigned_to_supervisor: 'Needs supervisor assignment',
  assigned_to_worker: 'Awaiting worker',
  assigned: 'Awaiting worker',
  accepted: 'Accepted by worker',
  in_progress: 'Work in progress',
  blocked: 'Blocked',
  awaiting_verification: 'Ready for verification',
  awaiting_confirmation: 'Ready for verification',
  closed: 'Completed',
  resolved: 'Completed',
  cancelled: 'False alert cancelled',
};

function bucketForStatus(status?: WorkOrderStatus, notice?: Notice): InboxBucket {
  if (status === 'closed' || status === 'resolved' || status === 'cancelled' || notice?.kind === 'closed') return 'completed';
  if (status === 'in_progress' || notice?.kind === 'started' || notice?.kind === 'in_progress') return 'progress';
  return 'action';
}

function parseDate(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function threadDate(order: WorkOrder | undefined, notices: Notice[]): string {
  if (notices[0]?.createdAt) return notices[0].createdAt;
  const lastEvent = order?.timeline[order.timeline.length - 1];
  return lastEvent?.at ?? order?.createdAt ?? '';
}

export function NoticesPage({ onNavigate }: { onNavigate: (p: ManagerPageId) => void }) {
  const { notices, workOrders, workers, stations, refreshLiveData } = useFactory();
  const [tab, setTab] = useState<InboxTab>('action');
  const [query, setQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('any');
  const [markingAll, setMarkingAll] = useState(false);
  useTick();

  const threads = useMemo<WorkOrderThread[]>(() => {
    const noticesByOrder = new Map<string, Notice[]>();
    const standalone: Notice[] = [];
    for (const notice of notices) {
      if (!notice.workOrderId) {
        standalone.push(notice);
        continue;
      }
      const group = noticesByOrder.get(notice.workOrderId) ?? [];
      group.push(notice);
      noticesByOrder.set(notice.workOrderId, group);
    }

    const ordersById = new Map(workOrders.map((order) => [order.id, order]));
    const orderIds = new Set([...noticesByOrder.keys(), ...ordersById.keys()]);
    const grouped: WorkOrderThread[] = [];

    for (const id of orderIds) {
      const order = ordersById.get(id);
      const items = (noticesByOrder.get(id) ?? []).sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
      const latestNotice = items[0];
      grouped.push({
        id,
        order,
        notices: items,
        latestNotice,
        createdAt: threadDate(order, items),
        bucket: bucketForStatus(order?.status, latestNotice),
      });
    }

    for (const notice of standalone) {
      grouped.push({
        id: notice.id,
        notices: [notice],
        latestNotice: notice,
        createdAt: notice.createdAt,
        bucket: bucketForStatus(undefined, notice),
      });
    }

    return grouped.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
  }, [notices, workOrders]);

  const unreadCount = notices.filter((notice) => !notice.read).length;
  const counts = useMemo(() => ({
    action: threads.filter((thread) => thread.bucket === 'action').length,
    progress: threads.filter((thread) => thread.bucket === 'progress').length,
    completed: threads.filter((thread) => thread.bucket === 'completed').length,
    all: threads.length,
  }), [threads]);

  const workerNameById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker.name])), [workers]);
  const visibleThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cutoff = dateRange === 'today'
      ? todayStart.getTime()
      : dateRange === '7d'
        ? Date.now() - 7 * 24 * 60 * 60 * 1000
        : dateRange === '30d'
          ? Date.now() - 30 * 24 * 60 * 60 * 1000
          : 0;

    return threads.filter((thread) => {
      if (tab !== 'all' && thread.bucket !== tab) return false;
      if (stationFilter !== 'all' && (thread.order?.stationId ?? thread.latestNotice?.stationId) !== stationFilter) return false;
      if (workerFilter !== 'all' && thread.order?.assigneeId !== workerFilter) return false;
      if (cutoff && parseDate(thread.createdAt) < cutoff) return false;
      if (!normalizedQuery) return true;

      const text = [
        thread.order?.id,
        thread.order?.title,
        thread.order?.machineId,
        thread.order?.stationId,
        thread.order?.assigneeId ? workerNameById.get(thread.order.assigneeId) : '',
        thread.latestNotice?.title,
        thread.latestNotice?.message,
        ...thread.notices.map((notice) => `${notice.title} ${notice.message}`),
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [threads, tab, query, stationFilter, workerFilter, dateRange, workerNameById]);

  const markRead = async (items: Notice[]) => {
    await Promise.all(items.filter((notice) => !notice.read).map((notice) => markNoticeReadApi(notice.id)));
    await refreshLiveData();
  };

  const markAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markRead(notices);
    } finally {
      setMarkingAll(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStationFilter('all');
    setWorkerFilter('all');
    setDateRange('any');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Order Inbox"
        description="Follow each job from assignment through verification, with its updates grouped together."
        actions={unreadCount > 0 ? (
          <button
            type="button"
            disabled={markingAll}
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <CheckCheck size={14} /> {markingAll ? 'Marking…' : `Mark ${unreadCount} updates read`}
          </button>
        ) : undefined}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Work order inbox views">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                  tab === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === item.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500'}`}>
                  {counts[item.id]}
                </span>
              </button>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 self-center text-[11px] font-medium text-slate-400">
              <Bell size={13} /> {unreadCount} unread updates
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_190px_150px]">
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order, machine, worker, or update"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <FilterSelect label="Station" value={stationFilter} onChange={setStationFilter}>
              <option value="all">All stations</option>
              {stations.map((station) => <option key={station.id} value={station.id}>Station {station.id}</option>)}
            </FilterSelect>
            <FilterSelect label="Worker" value={workerFilter} onChange={setWorkerFilter}>
              <option value="all">All workers</option>
              {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
            </FilterSelect>
            <FilterSelect label="Date" value={dateRange} onChange={(value) => setDateRange(value as DateRange)}>
              <option value="any">Any time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </FilterSelect>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleThreads.length === 0 ? (
            <div className="px-5 py-14 text-center">
              {tab === 'completed' ? <CheckCircle2 size={30} className="mx-auto text-emerald-400" /> : <Bell size={30} className="mx-auto text-slate-300" />}
                <h2 className="mt-3 text-sm font-bold text-slate-700">{emptyTitle(tab, query, counts[tab])}</h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                {threads.length === 0
                  ? 'New assignments, repair updates, and verification requests will appear here, grouped by work order.'
                  : 'Try another view or clear the filters to see more work orders.'}
              </p>
              {(query || stationFilter !== 'all' || workerFilter !== 'all' || dateRange !== 'any') && (
                <button type="button" onClick={resetFilters} className="mt-4 text-xs font-bold text-brand-700 hover:text-brand-800">
                  Clear filters
                </button>
              )}
              {tab === 'action' && counts.action === 0 && counts.progress + counts.completed > 0 && (
                <button type="button" onClick={() => setTab('all')} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800">
                  View all work orders <ArrowRight size={13} />
                </button>
              )}
            </div>
          ) : visibleThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              workerName={thread.order?.assigneeId ? workerNameById.get(thread.order.assigneeId) : undefined}
              onMarkRead={() => markRead(thread.notices)}
              onOpen={() => onNavigate('workorders')}
            />
          ))}
        </div>

        {visibleThreads.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
            <span>Showing {visibleThreads.length} of {counts[tab]} work orders</span>
            <span>Read status does not change work order status</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative flex items-center">
      <ListFilter size={14} className="pointer-events-none absolute left-3 text-slate-400" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 text-slate-400" />
    </label>
  );
}

function ThreadCard({
  thread,
  workerName,
  onMarkRead,
  onOpen,
}: {
  thread: WorkOrderThread;
  workerName?: string;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const notice = thread.latestNotice;
  const meta = noticeMeta[notice?.kind ?? ''] ?? noticeMeta.note;
  const Icon = meta.icon;
  const order = thread.order;
  const timelineUpdate = order?.timeline[order.timeline.length - 1];
  const title = order?.title ?? notice?.title ?? 'Factory update';
  const message = notice?.message ?? timelineUpdate?.message ?? order?.detail ?? '';
  const status = order?.status;
  const unread = thread.notices.filter((item) => !item.read).length;
  const statusText = status ? statusLabels[status] ?? status.replace(/_/g, ' ') : meta.label;
  const isComplete = thread.bucket === 'completed';
  const bucketStyle = isComplete
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : thread.bucket === 'progress'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <article className={`px-4 py-4 transition-colors sm:px-5 ${unread ? 'bg-amber-50/20' : 'bg-white'}`}>
      <div className="flex items-start gap-3.5">
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${bucketStyle}`}>{statusText}</span>
                {notice && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{meta.label}</span>}
                {unread > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{unread} unread</span>}
              </div>
              <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{message}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
              <Clock3 size={12} /> {thread.createdAt ? timeAgo(thread.createdAt) : 'Recently'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
            {order?.machineId && <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-700"><Wrench size={12} /> {order.machineId}</span>}
            {(order?.stationId ?? notice?.stationId) && <span className="inline-flex items-center gap-1"><MapPin size={12} /> Station {order?.stationId ?? notice?.stationId}</span>}
            {order?.assigneeId && <span className="inline-flex items-center gap-1"><UserRound size={12} /> {workerName ?? order.assigneeId}</span>}
            {thread.notices.length > 0 && <span>{thread.notices.length} update{thread.notices.length === 1 ? '' : 's'} in this thread</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {order?.id && <span className="font-mono text-[10px] text-slate-400">{order.id}</span>}
              {unread > 0 && (
                <button type="button" onClick={onMarkRead} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800">
                  Mark updates read
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900"
            >
              {isComplete ? 'View work order' : 'Open work order'} <ArrowRight size={13} />
            </button>
          </div>

          {thread.notices.length > 1 && (
            <details className="group mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold text-slate-600">
                <CircleDot size={13} className="text-slate-400" /> Show activity history ({thread.notices.length} updates)
                <ChevronDown size={13} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <ol className="mt-3 space-y-3 border-l border-slate-200 pl-3">
                {thread.notices.map((item) => (
                  <li key={item.id} className="relative">
                    <span className={`absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full ${item.read ? 'bg-slate-300' : 'bg-amber-500'}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">{item.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{item.message}</p>
                      </div>
                      <time className="shrink-0 text-[10px] text-slate-400">{timeAgo(item.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}

function emptyTitle(tab: InboxTab, query: string, count: number): string {
  if (query) return 'No work orders match those filters.';
  if (count === 0) return 'No work orders yet.';
  if (tab === 'action') return 'Nothing needs your attention.';
  if (tab === 'progress') return 'No work is currently in progress.';
  if (tab === 'completed') return 'No completed work orders yet.';
  return 'No work orders match these filters.';
}
