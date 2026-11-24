import { useState, useMemo, useEffect } from 'react';
import { getMachineMLAnalysis, resolveMachineApi } from '@/utils/api';
import {
  Search,
  Thermometer,
  Activity,
  Zap,
  Wrench,
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
  Shield,
  Brain,
  Gauge,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { MachineStatus, PageId } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useFactory, topRiskFactor } from '@/context/FactoryContext';
import { StatusBadge, ProgressBar } from '@/components/ui';
import { AssignControl, WorkOrderStatusBadge, DueLabel } from '@/components/WorkOrderBits';
import { ConfirmReopen } from '@/components/ConfirmReopen';
import { useAssign } from '@/components/AssignHost';
import { useToast } from '@/components/Toast';
import { issueKeys } from '@/utils/issues';
import {
  computeFailureRisk,
  detectMachineIssues,
  healthScoreColor,
  riskColor,
} from '@/utils/calculations';
import { MLExplainModal } from '@/components/MLExplainModal';
import { autoAssignNewWorkOrderApi } from '@/utils/api';

interface MachinesProps {
  initialMachineId?: string;
  onNavigate: (page: PageId) => void;
}

/* ─── helpers ─────────────────────────────────────────────────── */
const STATUS_PALETTE = {
  normal:   { dot: '#22c55e', ring: '#bbf7d0', bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Normal'  },
  warning:  { dot: '#f59e0b', ring: '#fde68a', bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Warning' },
  critical: { dot: '#ef4444', ring: '#fecaca', bg: 'bg-red-50',     text: 'text-red-700',     label: 'Critical'},
};

function StatusDot({ status, size = 10 }: { status: MachineStatus; size?: number }) {
  const p = STATUS_PALETTE[status];
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: p.dot,
        boxShadow: `0 0 0 3px ${p.ring}`,
      }}
    />
  );
}

function FleetSummaryBar({ machines }: { machines: ReturnType<typeof useFactory>['machines'] }) {
  const normal   = machines.filter(m => m.status === 'normal').length;
  const warning  = machines.filter(m => m.status === 'warning').length;
  const critical = machines.filter(m => m.status === 'critical').length;
  const total    = machines.length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { label: 'Healthy',  count: normal,   icon: CheckCircle,     color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', icon_bg: 'bg-emerald-100' },
        { label: 'Warning',  count: warning,  icon: AlertTriangle,   color: 'from-amber-500  to-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   icon_bg: 'bg-amber-100'   },
        { label: 'Critical', count: critical, icon: Shield,          color: 'from-red-500    to-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     icon_bg: 'bg-red-100'     },
      ].map(({ label, count, icon: Icon, bg, border, text, icon_bg, color }) => (
        <div key={label} className={`relative overflow-hidden rounded-2xl border ${border} ${bg} p-5 flex items-center gap-4 shadow-sm`}>
          <div className={`w-12 h-12 rounded-xl ${icon_bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className={text} />
          </div>
          <div>
            <p className={`text-3xl font-extrabold ${text} tabular-nums leading-none`}>{count}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{label} of {total}</p>
          </div>
          {/* decorative gradient bar */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color}`} />
        </div>
      ))}
    </div>
  );
}

/* ─── Station heat-map pill row ─────────────────────────────── */
function StationHeatBar({
  stations,
  machines,
  activeStation,
  onSelect,
}: {
  stations: string[];
  machines: ReturnType<typeof useFactory>['machines'];
  activeStation: string;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap mb-5">
      <button
        onClick={() => onSelect('All')}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
          activeStation === 'All'
            ? 'bg-brand-600 text-white border-brand-600 shadow-md'
            : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'
        }`}
      >
        <MapPin size={12} /> All Stations
      </button>
      {stations.map(st => {
        const sm = machines.filter(m => m.station === st);
        const crit = sm.filter(m => m.status === 'critical').length;
        const warn = sm.filter(m => m.status === 'warning').length;
        const dot  = crit > 0 ? '#ef4444' : warn > 0 ? '#f59e0b' : '#22c55e';
        const isActive = activeStation === st;
        return (
          <button
            key={st}
            onClick={() => onSelect(st)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
              isActive
                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: dot }}
            />
            Station {st}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {sm.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Machine Card (grid box) ─────────────────────────────────── */
function MachineCard({
  machine,
  onClick,
}: {
  machine: ReturnType<typeof useFactory>['machines'][number];
  onClick: () => void;
}) {
  const risk = computeFailureRisk(machine);
  const p    = STATUS_PALETTE[machine.status];

  const trend = machine.temperature > (machine as any)._prevTemp
    ? 'up'
    : machine.temperature < (machine as any)._prevTemp
    ? 'down'
    : 'flat';

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border bg-white shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden hover:-translate-y-0.5`}
      style={{ borderColor: machine.status === 'critical' ? '#fecaca' : machine.status === 'warning' ? '#fde68a' : '#e2e8f0' }}
    >
      {/* Top accent bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: p.dot }}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusDot status={machine.status} size={9} />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{machine.id}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
            {p.label}
          </span>
        </div>

        {/* Machine name */}
        <h3 className="text-sm font-bold text-slate-800 leading-snug mb-0.5 line-clamp-1">{machine.name}</h3>
        <p className="text-[11px] text-slate-400 mb-3">{machine.type}</p>

        {/* Metric chips */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <MetricChip icon={<Thermometer size={11} />} label="Temp" value={`${machine.temperature}°C`}
            warn={machine.temperature >= machine.thresholds.tempCritical} mild={machine.temperature >= machine.thresholds.tempWarn} />
          <MetricChip icon={<Activity size={11} />} label="Vib" value={`${machine.vibration}`}
            warn={machine.vibration >= machine.thresholds.vibCritical} mild={machine.vibration >= machine.thresholds.vibWarn} />
          <MetricChip icon={<Zap size={11} />} label="Power" value={`${machine.power} kW`}
            warn={machine.power >= machine.thresholds.powerCritical} mild={machine.power >= machine.thresholds.powerWarn} />
          <MetricChip icon={<Gauge size={11} />} label="Health" value={`${machine.healthScore}%`}
            warn={machine.healthScore < 50} mild={machine.healthScore < 70} invert />
        </div>

        {/* Risk bar */}
        <div className="mt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
            <span>Failure Risk</span>
            <span className={`font-bold ${riskColor(risk)}`}>{risk}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${risk}%`,
                background: risk >= 70 ? '#ef4444' : risk >= 40 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-50 flex items-center justify-between bg-slate-50/60">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <MapPin size={9} /> Station {machine.station}
        </span>
        <span className="text-[10px] font-semibold text-brand-600 group-hover:text-brand-700 flex items-center gap-0.5 transition-colors">
          Details <ChevronRight size={11} />
        </span>
      </div>
    </button>
  );
}

function MetricChip({
  icon, label, value, warn, mild, invert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
  mild?: boolean;
  invert?: boolean;
}) {
  const color = warn
    ? 'bg-red-50 text-red-600 border-red-100'
    : mild
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-semibold ${color}`}>
      <span className="opacity-70">{icon}</span>
      <span className="text-[10px] font-medium opacity-70">{label}</span>
      <span className="ml-auto tabular-nums">{value}</span>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export function MachineMonitoringPage({ initialMachineId, onNavigate }: MachinesProps) {
  const { session } = useAuth();
  const { machines, refreshLiveData } = useFactory();
  const toast = useToast();

  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = session?.stationId || 'A';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>('all');
  const [stationFilter, setStationFilter] = useState(() => (isSupervisor ? supervisorStation : 'All'));
  const [selectedId, setSelectedId] = useState<string | null>(initialMachineId ?? null);

  const stations = useMemo(
    () => Array.from(new Set(machines.map(m => m.station))).sort(),
    [machines]
  );

  const filtered = useMemo(() => {
    return machines.filter(m => {
      const matchSearch  = !search || m.id.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus  = statusFilter === 'all' || m.status === statusFilter;
      const matchStation = isSupervisor ? m.station === supervisorStation : (stationFilter === 'All' || m.station === stationFilter);
      return matchSearch && matchStatus && matchStation;
    });
  }, [machines, search, statusFilter, stationFilter, isSupervisor, supervisorStation]);

  const selected = machines.find(m => m.id === selectedId) ?? null;

  if (selected) {
    return (
      <MachineDetail
        machine={selected}
        onBack={() => setSelectedId(null)}
        onAddressed={async () => {
          try {
            await resolveMachineApi(selected.id, 'Supervisor resolved the machine issue directly.');
            await refreshLiveData();
            toast(`${selected.id} marked as resolved.`);
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to resolve issue.', 'error');
          }
        }}
        onNavigate={onNavigate}
      />
    );
  }

  const statusCounts = {
    all:      machines.length,
    normal:   machines.filter(m => m.status === 'normal').length,
    warning:  machines.filter(m => m.status === 'warning').length,
    critical: machines.filter(m => m.status === 'critical').length,
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isSupervisor ? `Station ${supervisorStation} Machine Telemetry` : 'Machine Monitoring & Fleet Diagnostics'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSupervisor
              ? `Real-time sensor telemetry and ML anomaly detection for Station ${supervisorStation} (${machines.length} units).`
              : 'Plant-wide telemetry, ML failure risk & anomaly detection across all 50 machines.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Telemetry Active
        </div>
      </div>

      {/* ── Fleet / Station Summary KPI cards ── */}
      <FleetSummaryBar machines={machines} />

      {/* ── Station heat-map tabs (Admin Only) ── */}
      {!isSupervisor && (
        <StationHeatBar
          stations={stations}
          machines={machines}
          activeStation={stationFilter}
          onSelect={setStationFilter}
        />
      )}

      {/* ── Search + Separate Status Views Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isSupervisor ? `Search Station ${supervisorStation} machine ID or name…` : 'Search machine ID or name…'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 focus:bg-white transition-all"
          />
        </div>

        {/* Separate Category Tabs (All, Critical, Warning, Normal) */}
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 self-start sm:self-auto flex-shrink-0 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Machines</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'critical'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'critical' ? 'bg-white' : 'bg-red-500'}`} />
            <span>Critical</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === 'critical' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {statusCounts.critical}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('warning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'warning'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'warning' ? 'bg-slate-950' : 'bg-amber-500'}`} />
            <span>Warning</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === 'warning' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-100 text-amber-800'
            }`}>
              {statusCounts.warning}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('normal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'normal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'normal' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Healthy</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === 'normal' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {statusCounts.normal}
            </span>
          </button>
        </div>
      </div>

      {/* ── Machine Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(m => (
          <MachineCard key={m.id} machine={m} onClick={() => setSelectedId(m.id)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No machines match your filters.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setStationFilter('All'); }}
            className="mt-3 text-xs text-brand-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Machine Detail (full page)
══════════════════════════════════════════════════════════════ */
function MachineDetail({
  machine,
  onBack,
  onAddressed,
}: {
  machine: ReturnType<typeof useFactory>['machines'][number];
  onBack: () => void;
  onAddressed: () => void | Promise<void>;
  onNavigate: (page: PageId) => void;
}) {
  const [showXAI, setShowXAI] = useState(false);
  const [autoDispatching, setAutoDispatching] = useState(false);
  const toast   = useToast();
  const risk    = machine.failureRisk ?? computeFailureRisk(machine);
  const factor  = topRiskFactor(machine);
  const issues  = detectMachineIssues(machine);
  const { issues: openIssues, activeOrderForIssue, workers } = useFactory();
  const openAssign = useAssign();
  const issue   = openIssues.find(i => i.id === issueKeys.machine(machine.id));
  const order   = activeOrderForIssue(issueKeys.machine(machine.id));
  const assignee = workers.find(w => w.id === order?.assigneeId);
  const p       = STATUS_PALETTE[machine.status];

  const readings = [
    { label: 'Temperature', value: machine.temperature, unit: '°C',   icon: Thermometer, warn: machine.thresholds.tempWarn,  crit: machine.thresholds.tempCritical  },
    { label: 'Vibration',   value: machine.vibration,   unit: 'mm/s', icon: Activity,    warn: machine.thresholds.vibWarn,   crit: machine.thresholds.vibCritical   },
    { label: 'Power Draw',  value: machine.power,       unit: 'kW',   icon: Zap,         warn: machine.thresholds.powerWarn, crit: machine.thresholds.powerCritical },
  ];

  return (
    <div className="space-y-6">
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{machine.id}</h1>
            <span className="text-slate-300 font-light text-xl">|</span>
            <h1 className="text-xl font-bold text-slate-700">{machine.name}</h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
            <MapPin size={12} /> Station {machine.station} · {machine.type}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${p.bg} ${p.text} border`}
          style={{ borderColor: p.ring }}>
          <StatusDot status={machine.status} size={8} />
          {p.label}
        </div>
      </div>

      {/* ── Reading cards + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: readings + chart */}
        <div className="lg:col-span-2 space-y-6">

          {/* Current Readings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Live Sensor Readings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest telemetry vs. threshold limits</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {readings.map(r => {
                const isCrit = r.value >= r.crit;
                const isWarn = r.value >= r.warn && !isCrit;
                const pct = Math.min(100, (r.value / (r.crit * 1.2)) * 100);
                const barColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e';
                const textColor = isCrit ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-emerald-600';
                const bgColor   = isCrit ? 'bg-red-50'   : isWarn ? 'bg-amber-50'   : 'bg-emerald-50';
                const iconColor = isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-emerald-400';
                const Icon = r.icon;
                return (
                  <div key={r.label} className={`p-5 ${bgColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={16} className={iconColor} />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{r.label}</span>
                    </div>
                    <p className={`text-3xl font-extrabold tabular-nums leading-none ${textColor}`}>
                      {r.value}
                      <span className="text-sm font-medium text-slate-400 ml-1">{r.unit}</span>
                    </p>
                    {/* gauge bar */}
                    <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                      <span>Warn {r.warn}</span>
                      <span>Crit {r.crit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Telemetry History</h3>
              <p className="text-xs text-slate-400 mt-0.5">12-hour sensor reading trend</p>
            </div>
            <div className="p-5">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={machine.telemetry} margin={{ left: -10, right: 10 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <ReferenceLine y={machine.thresholds.tempWarn}    stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value:'T-Warn', fontSize:10, fill:'#f59e0b', position:'insideTopRight' }} />
                    <ReferenceLine y={machine.thresholds.tempCritical} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value:'T-Crit', fontSize:10, fill:'#ef4444', position:'insideTopRight' }} />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" name="Temp (°C)"      strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="vibration"   stroke="#f59e0b" name="Vibration (mm/s)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="power"       stroke="#3b82f6" name="Power (kW)"     strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: risk + issues + maintenance */}
        <div className="space-y-5">

          {/* Risk card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-brand-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Failure Risk</h3>
                  <p className="text-[11px] text-slate-400">XGBoost + Isolation Forest</p>
                </div>
              </div>
              <button
                onClick={() => setShowXAI(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
              >
                <Brain size={11} /> XAI
              </button>
            </div>
            <div className="p-5">
              {/* Big risk number */}
              <div className="text-center mb-4">
                <div className="relative w-28 h-28 mx-auto mb-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={risk >= 70 ? '#ef4444' : risk >= 40 ? '#f59e0b' : '#22c55e'}
                      strokeWidth="10"
                      strokeDasharray={`${(risk / 100) * 251} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-extrabold tabular-nums ${riskColor(risk)}`}>{risk}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Risk</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Top Factor</p>
                  <p className="text-slate-800 font-semibold">{factor.factor}</p>
                  {factor.detail && <p className="text-xs text-slate-500 mt-0.5">{factor.detail}</p>}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recommended Action</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{machine.recommendedAction}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detected Issues */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Detected Issues</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">AI-identified problem signals</p>
            </div>
            <div className="p-5">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2.5 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle size={16} />
                  <span className="font-medium">All clear. Machine operating normally.</span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {issues.map((issueItem, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{issueItem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Wrench size={15} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Maintenance</h3>
            </div>
            <div className="p-5">
              {machine.addressed ? (
                <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle size={16} />
                  <span className="font-medium">Issue resolved and recorded.</span>
                </div>
              ) : order ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {assignee?.name.split(' ').map(p => p[0]).join('') ?? '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{assignee?.name}</p>
                      <p className="text-xs text-slate-400">{assignee?.jobTitle ?? 'Assigned maintenance worker'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <WorkOrderStatusBadge status={order.status} />
                    <DueLabel order={order} />
                  </div>
                  <ConfirmReopen order={order} />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No one is assigned yet. Dispatch intelligently via AI or assign manually.
                  </p>
                  <button
                    type="button"
                    disabled={autoDispatching}
                    onClick={async () => {
                      try {
                        setAutoDispatching(true);
                        const res = await autoAssignNewWorkOrderApi(
                          machine.id,
                          `Auto-Dispatch: ${machine.name} (${machine.issues[0] || 'Anomaly'})`,
                          machine.status === 'critical' ? 'critical' : 'warning'
                        );
                        toast(`⚡ Auto-Dispatched to ${res.order.assigneeName}! Allocated: ${res.order.spareParts}`);
                      } catch (e: any) {
                        toast(e?.message || 'Auto-dispatch failed', 'error');
                      } finally {
                        setAutoDispatching(false);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:from-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm border border-amber-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={13} className={autoDispatching ? 'animate-spin' : ''} />
                    <span>{autoDispatching ? 'Matching Best Worker...' : '⚡ 1-Click AI Auto-Dispatch'}</span>
                  </button>
                  <AssignControl issue={issue} onAssign={openAssign} />
                </div>
              )}
              {!machine.addressed && issue && (
                <button
                  onClick={() => {
                    if (window.confirm(`Mark ${machine.id} as resolved without worker confirmation?`)) onAddressed();
                  }}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw size={12} /> Resolve without assigning
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showXAI && <MLExplainModal machine={machine} onClose={() => setShowXAI(false)} />}
    </div>
  );
}
