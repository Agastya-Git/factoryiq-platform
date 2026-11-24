import { X, Sparkles, Brain, Clock, ShieldAlert, Cpu } from 'lucide-react';
import type { Machine } from '@/types';
import { computeMLInsights } from '@/utils/mlAnalytics';

interface MLExplainModalProps {
  machine: Machine;
  onClose: () => void;
}

export function MLExplainModal({ machine, onClose }: MLExplainModalProps) {
  const insights = machine.mlInsights ?? computeMLInsights(machine);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-elevated border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <Brain size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Machine Learning Diagnostic</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/30 text-brand-200 border border-brand-400/20">
                  XGBoost + Isolation Forest
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {machine.id} ({machine.name}) · Station {machine.station}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Failure Probability</p>
              <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">{insights.failureProbability}%</p>
              <p className="text-[11px] text-red-700/80 mt-0.5 font-medium">Random Forest Classifier</p>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Multivariate Drift</p>
              <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{insights.anomalyScore}</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5 font-medium">Isolation Forest ({insights.driftLevel})</p>
            </div>
            <div className="p-3.5 rounded-xl border border-brand-200 bg-brand-50/50">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estimated RUL</p>
              <p className="text-2xl font-bold text-brand-700 mt-1 tabular-nums">{insights.rulHours} hrs</p>
              <p className="text-[11px] text-brand-800/80 mt-0.5 font-medium">Remaining Useful Life</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-brand-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  SHAP Explainability Waterfall (Feature Attribution)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Base Prior: 12.0%</span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              How individual sensor channels shifted the model’s prediction from nominal baseline to {insights.failureProbability}%:
            </p>
            <div className="space-y-3">
              {insights.shapWaterfall.map((s) => (
                <div key={s.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">{s.value}</span>
                      <span className={`font-mono font-bold ${s.impact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        +{s.impact}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.impact > 30 ? 'bg-red-500' : s.impact > 15 ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(100, (s.impact / 45) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-brand-200 bg-brand-50 text-xs">
              <Cpu size={16} className="text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-brand-900">Model Diagnosis</p>
                <p className="text-brand-800 mt-0.5 leading-relaxed">{insights.primaryDiagnosis}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <ShieldAlert size={16} className="text-slate-600 shrink-0 mt-0.5" />
              <div className="font-mono text-[11px] text-slate-700">
                <span className="font-bold text-slate-500 uppercase block mb-0.5 font-sans">Tree Decision Path</span>
                {insights.decisionRule}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900">
            <p className="font-bold flex items-center gap-1.5">
              <Clock size={14} className="text-amber-700" /> Maintenance Action Window
            </p>
            <p className="mt-1 leading-relaxed">
              Based on the estimated RUL of <strong>{insights.rulHours} operating hours</strong>, schedule maintenance
              intervention before failure trajectory causes unscheduled line stoppage. Recommended intervention:{' '}
              <em>{machine.recommendedAction}</em>
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
