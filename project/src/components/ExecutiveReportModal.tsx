import { X, Printer, Factory, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Machine, ProductionStation } from '@/types';
import { formatINR, formatPercent } from '@/utils/format';

interface ExecutiveReportModalProps {
  factoryName: string;
  machines: Machine[];
  stations: ProductionStation[];
  summary: {
    productionEfficiency: number;
    downtimeRate: number;
    energyConsumption: number;
    monthlySavingsOpportunity: number;
    criticalCount: number;
    warningCount: number;
    normalCount: number;
  };
  oee: {
    availability: number;
    performance: number;
    quality: number;
    overall: number;
  };
  onClose: () => void;
}

export function ExecutiveReportModal({
  factoryName,
  machines,
  summary,
  oee,
  onClose,
}: ExecutiveReportModalProps) {
  const criticalMachines = machines.filter((m) => m.status === 'critical');
  const printReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Executive Report View</p>
          <div className="flex items-center gap-2">
            <button
              onClick={printReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-slate-800 print:p-0">
          <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Factory size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Plant Operations & Health Audit</h1>
                <p className="text-xs text-slate-500 font-medium">Facility: {factoryName} · FactoryIQ Monitoring System</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <p>Audit Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-emerald-600 font-semibold mt-0.5">Classification: Confidential / Board Review</p>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">1. Executive Summary & KPIs</h2>
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Overall OEE</p>
                <p className="text-xl font-bold text-slate-800">{formatPercent(oee.overall)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Avail {oee.availability}% · Perf {oee.performance}%</p>
              </div>
              <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Critical Equipment</p>
                <p className="text-xl font-bold text-red-600">{summary.criticalCount} Units</p>
                <p className="text-[10px] text-red-700/80 mt-0.5">Immediate intervention</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Estimated Fleet Downtime</p>
                <p className="text-xl font-bold text-slate-800">{formatPercent(summary.downtimeRate)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Target: &lt; 5.0%</p>
              </div>
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Savings Potential</p>
                <p className="text-xl font-bold text-emerald-700">{formatINR(summary.monthlySavingsOpportunity)}</p>
                <p className="text-[10px] text-emerald-800/80 mt-0.5">Downtime Loss Avoided</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">2. Critical Machine Diagnoses (ML Predicted)</h2>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 border-b">
                <tr>
                  <th className="p-2 text-left font-semibold">ID</th>
                  <th className="p-2 text-left font-semibold">Equipment</th>
                  <th className="p-2 text-left font-semibold">Station</th>
                  <th className="p-2 text-left font-semibold">Temp / Vib</th>
                  <th className="p-2 text-left font-semibold">Risk %</th>
                  <th className="p-2 text-left font-semibold">Estimated RUL</th>
                  <th className="p-2 text-left font-semibold">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criticalMachines.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2 font-bold text-slate-800">{m.id}</td>
                    <td className="p-2 font-medium">{m.name}</td>
                    <td className="p-2">Station {m.station}</td>
                    <td className="p-2 tabular-nums">{m.temperature}°C / {m.vibration} mm/s</td>
                    <td className="p-2 font-bold text-red-600">{m.mlInsights?.failureProbability ?? 78}%</td>
                    <td className="p-2 font-semibold text-brand-700">{m.mlInsights?.rulHours ?? 42} hrs</td>
                    <td className="p-2 text-slate-600">{m.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-600" /> High-Risk Machine Priority
              </h2>
              <p className="text-xs text-slate-600">
                <strong>Machine M03 & M07</strong> show elevated harmonic vibration and thermal drift exceeding warning limits. Immediate condition-based maintenance is scheduled to prevent line stoppage.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" /> Planned Maintenance Payback
              </h2>
              <p className="text-xs text-slate-600">
                Early component replacement during planned changeovers avoids an estimated <strong>18+ hours</strong> of unscheduled production stoppage, protecting <strong>₹45,000+</strong> in contribution margin.
              </p>
            </div>
          </div>

          <div className="border-t pt-6 flex justify-between items-end text-xs text-slate-400">
            <div>
              <p className="font-semibold text-slate-700">Meera Shah</p>
              <p>Plant Manager, Acme Manufacturing</p>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-300 w-44 mb-1"></div>
              <p>Authorized Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
