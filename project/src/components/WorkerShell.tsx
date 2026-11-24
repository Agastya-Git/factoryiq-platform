import { useState } from 'react';
import { Factory, LogOut, HardHat, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateWorkerAvailabilityApi } from '@/utils/api';

export function WorkerShell({ children }: { children: ReactNode }) {
  const { user, session, logout, updateUserAvailability } = useAuth();
  const [available, setAvailable] = useState<boolean>(session?.available ?? true);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (!session?.userId || toggling) return;
    setToggling(true);
    const nextState = !available;
    try {
      await updateWorkerAvailabilityApi(session.userId, nextState);
      setAvailable(nextState);
      updateUserAvailability?.(nextState);
    } catch {
      // Offline fallback
      setAvailable(nextState);
      updateUserAvailability?.(nextState);
    } finally {
      setToggling(false);
    }
  };

  const specialization = session?.specialization || ('specialization' in (user ?? {}) ? (user as any).specialization : 'Mechanical Maintenance');
  const stationId = session?.stationId || ('stationId' in (user ?? {}) ? (user as any).stationId : 'A');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Factory size={22} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-lg leading-tight tracking-tight text-white">Factory</span>
                <span className="font-black text-lg leading-tight tracking-tight text-amber-400">IQ</span>
                <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Worker Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Shopfloor Task Execution &amp; SOP Knowledge Base</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Station & Specialization */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                <Layers size={13} className="text-amber-400" />
                <span>Station {stationId}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                <HardHat size={13} className="text-amber-400" />
                <span>{specialization}</span>
              </span>
            </div>

            {/* Worker Availability Toggle */}
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                available
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
              }`}
              title="Toggle your availability for new supervisor assignments"
            >
              {available ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-rose-400" />}
              <span>{available ? 'Available' : 'Unavailable'}</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold leading-tight text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-400">@{session?.username || 'worker'}</p>
              </div>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Sign out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
    </div>
  );
}
