import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  PlusCircle,
  Layers,
  HardHat,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchStationsApi,
  createStationApi,
  fetchSupervisorsApi,
  createSupervisorApi,
  fetchWorkersApi,
  createWorkerApi,
  updateWorkerAvailabilityApi,
  unregisterWorkerApi,
  fetchAdminHierarchyApi
} from '@/utils/api';

const SPECIALIZATIONS = [
  'Mechanical Maintenance',
  'Electrical Maintenance',
  'Instrumentation & Controls',
  'Robotics & Automation',
  'HVAC & Utilities',
  'General Maintenance',
];

export function TeamManagementPage() {
  const { session, user } = useAuth();
  const isAdmin = session?.role === 'admin' || session?.role === 'manager';
  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = session?.stationId || 'A';

  const [stations, setStations] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showAddStation, setShowAddStation] = useState(false);
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);

  // Form states - Add Station
  const [stationName, setStationName] = useState('');
  const [stationDesc, setStationDesc] = useState('');
  const [stationIdCustom, setStationIdCustom] = useState('');

  // Form states - Add Supervisor
  const [supName, setSupName] = useState('');
  const [supUsername, setSupUsername] = useState('');
  const [supPassword, setSupPassword] = useState('');
  const [supStationId, setSupStationId] = useState('');

  // Form states - Add Worker
  const [wkrName, setWkrName] = useState('');
  const [wkrUsername, setWkrUsername] = useState('');
  const [wkrPassword, setWkrPassword] = useState('');
  const [wkrSpecialization, setWkrSpecialization] = useState(SPECIALIZATIONS[0]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const stns = await fetchStationsApi().catch(() => []);
      setStations(stns);

      if (isAdmin) {
        const hier = await fetchAdminHierarchyApi().catch(() => []);
        setHierarchy(hier);
      }

      if (isSupervisor) {
        const wkrs = await fetchWorkersApi(supervisorStation).catch(() => []);
        setWorkers(wkrs);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin, isSupervisor, supervisorStation]);

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await createStationApi(stationName, stationDesc, stationIdCustom || undefined);
      setSuccessMsg(`Station "${stationName}" created successfully.`);
      setShowAddStation(false);
      setStationName('');
      setStationDesc('');
      setStationIdCustom('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Could not create station');
    }
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await createSupervisorApi({
        name: supName,
        username: supUsername,
        password: supPassword,
        station_id: supStationId || stations[0]?.id || 'A',
      });
      setSuccessMsg(`Supervisor "${supName}" registered for Station ${supStationId || stations[0]?.id}.`);
      setShowAddSupervisor(false);
      setSupName('');
      setSupUsername('');
      setSupPassword('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Could not create supervisor');
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await createWorkerApi({
        name: wkrName,
        username: wkrUsername,
        password: wkrPassword,
        specialization: wkrSpecialization,
        station_id: supervisorStation,
        supervisor_id: session?.userId,
      });
      setSuccessMsg(`Worker "${wkrName}" added to Station ${supervisorStation}.`);
      setShowAddWorker(false);
      setWkrName('');
      setWkrUsername('');
      setWkrPassword('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Could not create worker');
    }
  };

  const [unregisteringWorker, setUnregisteringWorker] = useState<{ id: string; name: string } | null>(null);
  const [unregisteringLoading, setUnregisteringLoading] = useState(false);

  const handleConfirmUnregister = async () => {
    if (!unregisteringWorker) return;
    try {
      setUnregisteringLoading(true);
      const res = await unregisterWorkerApi(unregisteringWorker.id);
      setSuccessMsg(res.message || `Worker ${unregisteringWorker.name} has been unregistered.`);
      setUnregisteringWorker(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to unregister worker');
    } finally {
      setUnregisteringLoading(false);
    }
  };

  const handleToggleAvailability = async (workerId: string, currentAvailable: boolean) => {
    try {
      await updateWorkerAvailabilityApi(workerId, !currentAvailable);
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerId ? { ...w, available: !currentAvailable } : w))
      );
      if (isAdmin) {
        setHierarchy((prev) =>
          prev.map((h) => ({
            ...h,
            workers: h.workers.map((w: any) =>
              w.id === workerId ? { ...w, available: !currentAvailable } : w
            ),
          }))
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Could not update worker availability');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="text-amber-500" size={26} />
            <span>{isAdmin ? 'Factory Line & Team Management' : `Station ${supervisorStation} Maintenance Team`}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Organize production lines, appoint station supervisors, and monitor factory maintenance personnel.'
              : `Manage workers assigned to Station ${supervisorStation}, configure specializations, and track availability.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setShowAddStation(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <PlusCircle size={15} className="text-amber-400" />
                <span>Add Production Line</span>
              </button>

              <button
                onClick={() => {
                  setSupStationId(stations[0]?.id || 'A');
                  setShowAddSupervisor(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <UserPlus size={15} />
                <span>Add Supervisor</span>
              </button>
            </>
          )}

          {isSupervisor && (
            <button
              onClick={() => setShowAddWorker(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <UserPlus size={15} />
              <span>Add Factory Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Production Lines (Stations) Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="text-slate-700" size={18} />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Active Production Stations ({stations.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Dynamic Lines (Zero Hardcoded Limit)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stations.map((s) => (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isSupervisor && supervisorStation === s.id
                  ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-200'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 bg-slate-800 text-white text-[11px] font-bold rounded">
                  Station {s.id}
                </span>
                {isSupervisor && supervisorStation === s.id && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                    Your Assigned Station
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug">{s.name}</p>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{s.description || 'Production line active.'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN VIEW: Hierarchy of Supervisors & Their Workers */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="text-amber-500" size={18} />
              <span>Supervisors & Designated Workers by Line</span>
            </h2>
            <span className="text-xs text-slate-500">Full factory organizational tree</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hierarchy.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Supervisor Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {item.supervisor.stationId}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.supervisor.name}</span>
                        <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          @{item.supervisor.username}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Supervisor • {item.supervisor.stationName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {item.workers.length} Workers
                  </span>
                </div>

                {/* Assigned Workers List */}
                <div className="p-4 divide-y divide-slate-100">
                  {item.workers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No workers added under this supervisor yet. Supervisor can add workers from their portal.
                    </p>
                  ) : (
                    item.workers.map((w: any) => (
                      <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <HardHat size={16} className="text-slate-400" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{w.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">({w.username})</span>
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Briefcase size={11} className="text-slate-400" />
                              <span>{w.specialization}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAvailability(w.id, w.available)}
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                              w.available
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                            title="Click to toggle worker availability"
                          >
                            {w.available ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{w.available ? 'Available' : 'Unavailable'}</span>
                          </button>

                          <button
                            onClick={() => setUnregisteringWorker({ id: w.id, name: w.name })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={`Unregister worker ${w.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPERVISOR VIEW: Station Workers with Availability Controls */}
      {isSupervisor && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <HardHat className="text-sky-600" size={18} />
                <span>Station {supervisorStation} Factory Maintenance Workers ({workers.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Workers registered under your station. Automatically inherited upon creation.
              </p>
            </div>

            <button
              onClick={() => setShowAddWorker(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus size={14} />
              <span>Add Worker</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {workers.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <HardHat size={30} className="mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-bold text-slate-800">No factory workers registered yet for Station {supervisorStation}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click "Add Worker" above to register a new maintenance technician. Once created, they will immediately have a dedicated dashboard to view assignments, update status, and access the SOP knowledge base.
                </p>
                <button
                  onClick={() => setShowAddWorker(true)}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus size={14} />
                  <span>Register First Worker</span>
                </button>
              </div>
            ) : (
              workers.map((w) => (
              <div key={w.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{w.name}</h3>
                    <p className="text-[11px] text-slate-500">Username: <code>{w.username}</code></p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      w.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {w.available ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    <span>{w.available ? 'Ready' : 'Off-duty'}</span>
                  </span>
                </div>

                <div className="text-xs bg-white p-2 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Specialization:</span>
                    <span className="font-bold text-slate-800">{w.specialization}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Station:</span>
                    <span className="font-bold text-slate-800">Station {w.stationId}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleAvailability(w.id, w.available)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {w.available ? (
                      <ToggleRight size={22} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={22} className="text-slate-400" />
                    )}
                    <span>{w.available ? 'Available' : 'Unavailable'}</span>
                  </button>

                  <button
                    onClick={() => setUnregisteringWorker({ id: w.id, name: w.name })}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Unregister ${w.name}`}
                  >
                    <Trash2 size={12} />
                    <span>Unregister</span>
                  </button>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* ── MODAL: Add Production Line / Station (Admin) ── */}
      {showAddStation && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="text-amber-500" size={18} />
                <span>Add Production Line / Station</span>
              </h3>
              <button
                onClick={() => setShowAddStation(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Line / Station Name *
                </label>
                <input
                  type="text"
                  required
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="e.g. Station E - Surface Coating & Thermal Treat"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Station Code / ID (Optional - auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={stationIdCustom}
                  onChange={(e) => setStationIdCustom(e.target.value.toUpperCase())}
                  placeholder="e.g. E, F, or LINE-05"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Process Details
                </label>
                <textarea
                  rows={3}
                  value={stationDesc}
                  onChange={(e) => setStationDesc(e.target.value)}
                  placeholder="Describe machinery, equipment types, and fabrication role..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStation(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Create Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Supervisor (Admin) ── */}
      {showAddSupervisor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-amber-500" size={18} />
                <span>Add Station Supervisor</span>
              </h3>
              <button
                onClick={() => setShowAddSupervisor(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupervisor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={supUsername}
                  onChange={(e) => setSupUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. supervisor.e"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={supPassword}
                  onChange={(e) => setSupPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Station (Dropdown) *
                </label>
                <select
                  required
                  value={supStationId}
                  onChange={(e) => setSupStationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      Station {st.id} — {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupervisor(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Create Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Factory Worker (Supervisor) ── */}
      {showAddWorker && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-sky-600" size={18} />
                <span>Add Factory Worker</span>
              </h3>
              <button
                onClick={() => setShowAddWorker(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 bg-sky-50 rounded-lg text-[11px] text-sky-800 border border-sky-100">
              Station & Supervisor are automatically assigned: <strong>Station {supervisorStation}</strong> (Your Station).
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Worker Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={wkrName}
                  onChange={(e) => setWkrName(e.target.value)}
                  placeholder="e.g. Amit Patil"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={wkrUsername}
                  onChange={(e) => setWkrUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. amit"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={wkrPassword}
                  onChange={(e) => setWkrPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialization (Dropdown) *
                </label>
                <select
                  required
                  value={wkrSpecialization}
                  onChange={(e) => setWkrSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  {SPECIALIZATIONS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWorker(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm Unregister Worker ── */}
      {unregisteringWorker && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Unregister Worker</h3>
                <p className="text-xs text-slate-500">Workforce De-registration</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to unregister <strong className="text-slate-900">{unregisteringWorker.name}</strong> from the workforce?
              Any work orders currently assigned to this worker will be automatically unassigned and returned to the station backlog.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnregisteringWorker(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnregister}
                disabled={unregisteringLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {unregisteringLoading ? 'Unregistering...' : 'Yes, Unregister Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
