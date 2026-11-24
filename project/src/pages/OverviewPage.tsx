import { useState, useMemo } from 'react';
import {
  Cpu,
  AlertTriangle,
  Zap,
  TrendingDown,
  Gauge,
  Activity,
  ChevronRight,
  Wrench,
  ArrowUpRight,
  Shield,
  Layers,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { PageId, Machine } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useFactory } from '@/context/FactoryContext';
import { KpiCard, SectionCard, PageHeader } from '@/components/ui';
import { AssignControl } from '@/components/WorkOrderBits';
import { useAssign } from '@/components/AssignHost';
import { formatINR, formatNumber, formatPercent } from '@/utils/format';
import { computeOEE } from '@/utils/oeeCarbon';
import { isActive } from '@/utils/issues';
import { computeMachineRupeesAtRisk } from '@/utils/calculations';
import { ExecutiveReportModal } from '@/components/ExecutiveReportModal';

interface OverviewProps {
  onNavigate: (page: PageId, machineId?: string) => void;
}

export function OverviewPage({ onNavigate }: OverviewProps) {
  const { session, user } = useAuth();
  const { summary, machines, allMachines, factory, stations, workOrders } = useFactory();
  const openAssign = useAssign();
  const [showReport, setShowReport] = useState(false);

  const isAdmin = session?.role === 'admin' || session?.role === 'manager';
  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = session?.stationId || 'A';
  const supervisorStationName = isSupervisor && user && 'stationName' in user ? (user as any).stationName : `Station ${supervisorStation}`;

  const oee = computeOEE(summary.downtimeRate);

  const healthData = [
    { name: 'Normal', value: summary.normalCount, color: '#10b981' },
    { name: 'Warning', value: summary.warningCount, color: '#f59e0b' },
    { name: 'Critical', value: summary.criticalCount, color: '#ef4444' },
  ];

  // Accurately filter critical & warning machines in current scope
  const criticalMachines = useMemo(() => machines.filter((m) => m.status === 'critical'), [machines]);
  const warningMachines = useMemo(() => machines.filter((m) => m.status === 'warning'), [machines]);

  // Admin exclusive: Compute comparative statistics for each of the 4 stations
  const stationComparison = useMemo(() => {
    const list = ['A', 'B', 'C', 'D'];
    const names: Record<string, string> = {
      A: 'Machining & Fabrication',
      B: 'Forming & Pressing',
      C: 'Robotic Assembly & Welding',
      D: 'Finishing, Inspection & Packaging',
    };
    const ranges: Record<string, string> = {
      A: 'M01 – M13',
      B: 'M14 – M25',
      C: 'M26 – M38',
      D: 'M39 – M50',
    };
    const supervisors: Record<string, { name: string; username: string }> = {
      A: { name: 'Vikram Sharma', username: 'supervisor.a' },
      B: { name: 'Ananya Patel', username: 'supervisor.b' },
      C: { name: 'Arjun Mehta', username: 'supervisor.c' },
      D: { name: 'Rajesh Nair', username: 'supervisor.d' },
    };

    return list.map((stId) => {
      const stMachines = allMachines.filter((m) => m.station === stId);
      const total = stMachines.length;
      const normal = stMachines.filter((m) => m.status === 'normal').length;
      const warning = stMachines.filter((m) => m.status === 'warning').length;
      const critical = stMachines.filter((m) => m.status === 'critical').length;
      const riskINR = stMachines.reduce((sum, m) => sum + (m.rupeesAtRisk || 0), 0);
      const stOrders = workOrders.filter((w) => w.stationId === stId && isActive(w));
      
      const stDowntimeRate = total > 0 ? ((critical * 4.2 + warning * 1.5) / total * 10) : 0;
      const stOEE = computeOEE(stDowntimeRate);

      return {
        id: stId,
        name: names[stId],
        range: ranges[stId],
        supervisor: supervisors[stId],
        total,
        normal,
        warning,
        critical,
        oee: stOEE.overall,
        riskINR,
        activeOrders: stOrders.length,
      };
    });
  }, [allMachines, workOrders]);

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <PageHeader
        title={isAdmin ? 'Factory Overview' : `Station ${supervisorStation} Line Overview`}
        description={
          isAdmin
            ? `Current condition of ${factory.name}. Equipped with XGBoost failure prediction & World-Class OEE benchmarking.`
            : `Dedicated operational dashboard for Station ${supervisorStation} (${supervisorStationName}). Scoped to ${machines.length} designated production machines.`
        }
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowReport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm"
              >
                <FileText size={14} /> Executive Audit Report
              </button>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-card text-xs text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isAdmin ? 'Plant Telemetry Live' : `Station ${supervisorStation} Stream Live`}
            </span>
          </div>
        }
      />

      {/* KPI Cards Row (Dynamically Scoped) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={isAdmin ? 'Total Machines' : `Station ${supervisorStation} Machines`}
          value={formatNumber(summary.totalMachines)}
          icon={<Cpu size={18} />}
          accent="navy"
          sub={isAdmin ? 'Across 4 production stations' : `Exclusive to Station ${supervisorStation}`}
        />
        <KpiCard
          label="Critical Outliers"
          value={formatNumber(summary.criticalCount)}
          icon={<AlertTriangle size={18} />}
          accent="red"
          sub={summary.criticalCount > 0 ? 'Urgent maintenance required' : 'Zero critical faults'}
        />
        <KpiCard
          label={isAdmin ? 'Overall Plant OEE' : `Station ${supervisorStation} OEE`}
          value={formatPercent(oee.overall)}
          icon={<Gauge size={18} />}
          accent="blue"
          sub={`Avail ${oee.availability}% · Perf ${oee.performance}% · Qual ${oee.quality}%`}
        />
        <KpiCard
          label={isAdmin ? 'Rupees at Risk' : 'Station Risk Exposure'}
          value={formatINR(summary.monthlySavingsOpportunity)}
          icon={<TrendingDown size={18} />}
          accent={summary.criticalCount > 0 ? 'red' : 'green'}
          sub="Estimated machine-specific exposure"
        />
      </div>

      {/* Mini Stats Quick Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Healthy Fleet" value={summary.normalCount} total={summary.totalMachines} tone="green" icon={<Activity size={14} />} />
        <MiniStat label="Warning State" value={summary.warningCount} total={summary.totalMachines} tone="amber" icon={<AlertTriangle size={14} />} />
        <MiniStat label="Estimated Downtime Rate" value={summary.downtimeRate} decimals={1} suffix="%" tone="amber" icon={<TrendingDown size={14} />} />
        <MiniStat label="Active Work Orders" value={workOrders.filter(isActive).length} tone="navy" icon={<Wrench size={14} />} />
      </div>

      {/* OEE Industrial Benchmark Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isAdmin ? 'Industrial OEE (Overall Equipment Effectiveness)' : `Station ${supervisorStation} Line OEE`}
            </h3>
            <p className="text-xs text-slate-400">Benchmark formula: Availability × Performance × Quality</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
            Target: 85.0%+ (Current: {oee.overall}%)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-3 text-center">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Availability</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{oee.availability}%</p>
            <p className="text-[11px] text-slate-400">100% − {summary.downtimeRate}% Downtime</p>
          </div>
          <div className="border-x border-slate-100 px-2">
            <p className="text-xs text-slate-400 font-semibold uppercase">Performance</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{oee.performance}%</p>
            <p className="text-[11px] text-slate-400">Machine cycle efficiency</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Quality Yield</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{oee.quality}%</p>
            <p className="text-[11px] text-slate-400">0.5% Scrap / Re-work</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Machine Health Distribution & SEPARATE Scrollable Boxes for Critical and Warning Machines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Donut Chart for Machine Health */}
        <div className="lg:col-span-4">
          <SectionCard
            title={isAdmin ? 'Fleet Health Distribution' : `Station ${supervisorStation} Health`}
            subtitle={`${summary.totalMachines} machines evaluated`}
          >
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={74}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
              {healthData.map((h) => (
                <div key={h.name} className="text-center">
                  <p className="text-lg font-bold text-slate-800 tabular-nums">{h.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{h.name}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right: TWO SEPARATE SCROLLABLE BOXES (Critical Machines vs Warning Machines) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* BOX 1: Critical State Machines (Scrollable Box) */}
          <div className="bg-white rounded-xl border border-red-200/80 shadow-sm p-4">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-red-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Critical State Machines</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {criticalMachines.length}
                  </span>
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-red-600">Immediate Action Required</span>
            </div>

            {/* Scrollable list for Critical */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {criticalMachines.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 bg-emerald-50/50 rounded-lg border border-dashed border-emerald-200">
                  <CheckCircle2 size={24} className="mx-auto mb-1.5 text-emerald-500" />
                  <p className="font-bold">Zero Critical Faults</p>
                  <p className="text-slate-500 text-[11px]">All machines operating within safe baseline parameters.</p>
                </div>
              ) : (
                criticalMachines.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigate('machines', m.id)}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/40 hover:bg-red-50 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {m.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                            {m.name}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-white">
                            Station {m.station}
                          </span>
                        </div>
                        <p className="text-[11px] text-red-800 font-medium mt-0.5">
                          {m.recommendedAction || 'High vibration/temperature detected. Bearing inspection needed.'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Sensors: <span className="font-mono text-red-600 font-bold">{m.temperature}°C</span> • <span className="font-mono text-red-600 font-bold">{m.vibration} mm/s</span> • Power: {m.power} kW
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Risk</span>
                        <span className="text-xs font-black text-red-600">
                          {formatINR(m.rupeesAtRisk && m.rupeesAtRisk > 0 ? m.rupeesAtRisk : computeMachineRupeesAtRisk(m))}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BOX 2: Warning State Machines (Scrollable Box) */}
          <div className="bg-white rounded-xl border border-amber-200/80 shadow-sm p-4">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Warning State Machines</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {warningMachines.length}
                  </span>
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-600">Preventive Inspection Needed</span>
            </div>

            {/* Scrollable list for Warning */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {warningMachines.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <CheckCircle2 size={20} className="mx-auto mb-1 text-slate-400" />
                  <p className="font-semibold">No Machines in Warning State</p>
                </div>
              ) : (
                warningMachines.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigate('machines', m.id)}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 hover:bg-amber-50 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {m.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                            {m.name}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-white">
                            Station {m.station}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 font-medium mt-0.5">
                          {m.recommendedAction || 'Thermal dissipation elevated. Filter cleaning advised.'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Sensors: <span className="font-mono text-amber-700 font-bold">{m.temperature}°C</span> • <span className="font-mono text-amber-700 font-bold">{m.vibration} mm/s</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Risk</span>
                        <span className="text-xs font-bold text-amber-700">
                          {formatINR(m.rupeesAtRisk && m.rupeesAtRisk > 0 ? m.rupeesAtRisk : computeMachineRupeesAtRisk(m))}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── ADMIN EXCLUSIVE: 4 STATIONS COMPARATIVE BENCHMARKING ── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mb-1">
                <Layers size={13} />
                <span>Admin Fleet Oversight</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Production Station Comparison &amp; Line Performance
              </h2>
              <p className="text-xs text-slate-500">
                Live benchmarking across all 4 production lines: machine health distribution, OEE, supervisor ownership, and financial risk exposure.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Auto-updated from PostgreSQL telemetry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stationComparison.map((st) => {
              const hasCritical = st.critical > 0;
              const hasWarning = st.warning > 0;
              return (
                <div
                  key={st.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all shadow-sm ${
                    hasCritical
                      ? 'border-red-200 bg-red-50/20'
                      : hasWarning
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded-lg shadow-sm">
                        Station {st.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hasCritical
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : hasWarning
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {hasCritical ? 'Action Required' : hasWarning ? 'Monitoring' : 'Optimal'}
                      </span>
                    </div>

                    {/* Name & Range */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{st.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Machines: {st.range} ({st.total} units)</p>
                    </div>

                    {/* Supervisor Card */}
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Station Supervisor</p>
                      <p className="font-bold text-slate-800">{st.supervisor.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">@{st.supervisor.username}</p>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 bg-slate-50 rounded-lg text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Line OEE</span>
                        <span className="font-black text-sm text-slate-800">{st.oee}%</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Open Orders</span>
                        <span className="font-black text-sm text-slate-800">{st.activeOrders}</span>
                      </div>
                    </div>

                    {/* Health breakdown bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Healthy: <strong className="text-emerald-700">{st.normal}</strong></span>
                        <span>Warn: <strong className="text-amber-700">{st.warning}</strong></span>
                        <span>Crit: <strong className="text-red-700">{st.critical}</strong></span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
                        <div style={{ width: `${(st.normal / st.total) * 100}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${(st.warning / st.total) * 100}%` }} className="bg-amber-500" />
                        <div style={{ width: `${(st.critical / st.total) * 100}%` }} className="bg-red-500" />
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Risk Exposure</span>
                      <span className="text-xs font-black text-slate-800">{formatINR(st.riskINR)}</span>
                    </div>

                    <button
                      onClick={() => onNavigate('machines', st.range.split(' ')[0])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <span>Telemetry</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Executive Report Modal (Admin) */}
      {showReport && (
        <ExecutiveReportModal
          factoryName={factory.name}
          machines={allMachines}
          stations={stations}
          summary={summary}
          oee={oee}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  total,
  tone,
  suffix = '',
  decimals,
  icon,
}: {
  label: string;
  value: number;
  total?: number;
  tone: 'green' | 'amber' | 'red' | 'navy';
  suffix?: string;
  decimals?: number;
  icon?: React.ReactNode;
}) {
  const toneClasses = {
    green: 'border-l-emerald-500 text-emerald-700 bg-emerald-50/30',
    amber: 'border-l-amber-500 text-amber-700 bg-amber-50/30',
    red:   'border-l-rose-500 text-rose-700 bg-rose-50/30',
    navy:  'border-l-slate-800 text-slate-800 bg-slate-50',
  };

  const formatted = decimals !== undefined ? value.toFixed(decimals) : formatNumber(value);

  return (
    <div className={`p-3 rounded-xl border border-slate-200 border-l-4 ${toneClasses[tone]} shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <span className="opacity-70">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-black text-slate-900 tabular-nums">{formatted}{suffix}</span>
        {total !== undefined && (
          <span className="text-xs text-slate-400 font-semibold">/ {total}</span>
        )}
      </div>
    </div>
  );
}
