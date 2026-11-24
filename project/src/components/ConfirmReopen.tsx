import { useState } from 'react';
import { CheckCircle, RotateCcw } from 'lucide-react';
import type { WorkOrder } from '@/types';
import { useFactory } from '@/context/FactoryContext';
import { useToast } from '@/components/Toast';
import { supervisorVerifyCloseApi } from '@/utils/api';

/** Manager's review controls for an order the worker marked as solved. */
export function ConfirmReopen({ order, onDone }: { order: WorkOrder; onDone?: () => void }) {
  const { refreshLiveData } = useFactory();
  const toast = useToast();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (order.status !== 'awaiting_confirmation' && order.status !== 'awaiting_verification') return null;

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await supervisorVerifyCloseApi(order.id, true, 'Repair confirmed from machine detail.');
      await refreshLiveData();
      toast(`${order.machineId ?? `Station ${order.stationId}`} confirmed resolved. Dashboard updated.`);
      onDone?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to confirm repair.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await supervisorVerifyCloseApi(order.id, false, reason.trim() || 'Repair requires additional work.');
      await refreshLiveData();
      toast('Reopened. The worker will see your reason.');
      setReopening(false);
      setReason('');
      onDone?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to return task for rework.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (reopening) {
    return (
      <div className="space-y-2 w-full">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
          autoFocus
          placeholder="Why is it not fixed yet?"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
        />
        <div className="flex gap-2">
          <button onClick={reopen} disabled={saving} className="px-3.5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg">
            Reopen task
          </button>
          <button onClick={() => setReopening(false)} className="px-3.5 py-2 text-sm text-slate-600 hover:text-slate-800">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={confirm}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg shadow-sm"
      >
        <CheckCircle size={15} /> Confirm resolved
      </button>
      <button
        onClick={() => setReopening(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
      >
        <RotateCcw size={15} /> Reopen
      </button>
    </div>
  );
}
