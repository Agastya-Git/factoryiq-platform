import { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, Sparkles, Clock } from 'lucide-react';
import type { CriticalIssue, Priority } from '@/types';
import { useFactory } from '@/context/FactoryContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { categoryLabel, defaultDueHours, defaultPriority } from '@/utils/issues';
import { formatINR } from '@/utils/format';
import { PriorityBadge } from '@/components/WorkOrderBits';
import { createWorkOrderApi } from '@/utils/api';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssignModal({ issue, onClose }: { issue: CriticalIssue; onClose: () => void }) {
  const { workers, workOrders, suggestWorker, hourlyDelayCost, refreshLiveData } = useFactory();
  const { session } = useAuth();
  const toast = useToast();

  const suggestion = useMemo(() => suggestWorker(issue), [issue, suggestWorker]);
  const [assigneeId, setAssigneeId] = useState(suggestion.worker?.id ?? workers[0]?.id ?? '');
  const [priority, setPriority] = useState<Priority>(defaultPriority(issue.severity));
  const [due, setDue] = useState(() =>
    toLocalInput(new Date(Date.now() + defaultDueHours(issue.severity) * 3600_000))
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (workers.some((worker) => worker.id === assigneeId)) return;
    setAssigneeId(suggestion.worker?.id ?? workers[0]?.id ?? '');
  }, [assigneeId, suggestion.worker, workers]);

  const load = (id: string) => workOrders.filter((w) => w.assigneeId === id && w.status !== 'resolved' && w.status !== 'closed' && w.status !== 'cancelled').length;
  const selected = workers.find((w) => w.id === assigneeId);

  const submit = async () => {
    if (saving) return;
    if (!assigneeId) {
      setError('No registered worker is available for assignment.');
      return;
    }
    const dueDate = new Date(due);
    if (Number.isNaN(dueDate.getTime())) {
      setError('Choose a valid due date and time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await createWorkOrderApi({
        issue_key: issue.id,
        source: issue.source,
        machine_id: issue.machineId,
        station_id: issue.stationId,
        title: issue.title,
        detail: issue.detail,
        action: issue.action,
        severity: issue.severity,
        priority,
        specialization_required: categoryLabel[issue.category],
        assignee_id: assigneeId,
        assigned_by_id: session?.userId,
        manager_note: note.trim(),
        due_at: dueDate.toISOString(),
      });
      await refreshLiveData();
      toast(res.duplicate_prevented
        ? `${issue.title.split(' — ')[0]} already has an active work order.`
        : `${issue.title.split(' — ')[0]} assigned to ${selected?.name}. They will see it in their task list.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Assign issue"
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-elevated max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assign issue</p>
            <h2 className="text-base font-bold text-slate-800 leading-snug mt-0.5">{issue.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-sm space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  issue.severity === 'critical'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {issue.severity === 'critical' ? 'Critical' : 'Warning'}
              </span>
              <span className="text-xs text-slate-500">{categoryLabel[issue.category]} issue</span>
            </div>
            <p className="text-slate-600 leading-relaxed">{issue.detail}</p>
            <p className="text-xs text-brand-700 font-medium">Recommended: {issue.action}</p>
          </div>

          <div className="flex items-center gap-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
            <Clock size={14} className="shrink-0" />
            <span>
              Each hour this stays unassigned can cost about{' '}
              <strong>{formatINR(hourlyDelayCost)}</strong> in lost contribution (illustrative).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Assign to
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.jobTitle} · {w.shift} shift{w.available ? '' : ' (off shift)'} · {load(w.id)} open
                </option>
              ))}
            </select>
            {suggestion.worker && assigneeId === suggestion.worker.id && (
              <p className="flex items-center gap-1.5 text-xs text-brand-700 mt-1.5">
                <Sparkles size={13} /> Suggested: {suggestion.reason}
              </p>
            )}
            {selected && !selected.available && (
              <p className="text-xs text-amber-700 mt-1.5">{selected.name} is currently off shift.</p>
            )}
            {selected && !selected.skills.includes(issue.category) && (
              <p className="text-xs text-amber-700 mt-1.5">
                {selected.name} is not listed for {categoryLabel[issue.category].toLowerCase()} work.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Priority</label>
              <div className="flex items-center gap-2">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <PriorityBadge priority={priority} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Due by</label>
              <input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Note for the worker (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Shut the line down before inspecting the bearing."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg shadow-md shadow-brand-600/20"
          >
            <UserPlus size={15} /> {saving ? 'Assigning…' : 'Assign task'}
          </button>
        </div>
      </div>
    </div>
  );
}
