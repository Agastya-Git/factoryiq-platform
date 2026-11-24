import { useState } from 'react';
import {
  TrendingDown,
  Calculator,
  CheckCircle,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useFactory } from '@/context/FactoryContext';
import { KpiCard, SectionCard, PageHeader } from '@/components/ui';
import { formatINR, formatNumber } from '@/utils/format';

export function BusinessPage() {
  const { businessInputs, setBusinessInputs, workOrders, machines } = useFactory();

  const openOrders = workOrders.filter((w) => w.status !== 'closed' && w.status !== 'resolved' && w.status !== 'cancelled');
  const awaitingOrders = workOrders.filter((w) => w.status === 'awaiting_verification' || w.status === 'awaiting_confirmation');
  const resolvedOrders = workOrders.filter((w) => w.status === 'closed' || w.status === 'resolved');
  
  // Calculate impact addressed from resolved orders, defaulting to standard estimate per resolved machine
  const impactAddressed = resolvedOrders.reduce((sum, w) => sum + (w.impactINR || 33750), 0);

  const [downtimeHours, setDowntimeHours] = useState(businessInputs.downtimeHours);
  const [productionRate, setProductionRate] = useState(businessInputs.productionRate);
  const [margin, setMargin] = useState(businessInputs.contributionMargin);
  const [retrofitCost, setRetrofitCost] = useState(150000);

  // Sum actual live rupees at risk from active machines
  const liveRupeesAtRisk = machines.reduce((sum, m) => sum + (m.rupeesAtRisk || 0), 0);

  const affectedProduction = downtimeHours * productionRate;
  const contributionLoss = liveRupeesAtRisk > 0 ? liveRupeesAtRisk : (affectedProduction * margin);

  const monthlyCombinedSavings = contributionLoss > 0 ? contributionLoss : 45000;
  const paybackMonths = Math.max(0.1, Math.round((retrofitCost / monthlyCombinedSavings) * 10) / 10);
  const threeYearROI = Math.round((((monthlyCombinedSavings * 36) - retrofitCost) / retrofitCost) * 100);

  const updateAll = (patch: Partial<typeof businessInputs>) => {
    const next = { ...businessInputs, ...patch };
    setBusinessInputs(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Impact & ROI"
        description="Quantifying the financial value of predictive maintenance and condition-based monitoring."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Downtime Loss Exposure"
          value={formatINR(contributionLoss)}
          icon={<TrendingDown size={18} />}
          accent="red"
          sub="Monthly production at risk"
        />
        <KpiCard
          label="Repairs Addressed"
          value={formatINR(impactAddressed)}
          icon={<Wrench size={18} />}
          accent="blue"
          sub="Resolved ticket savings"
        />
        <KpiCard
          label="Monthly Savings Opportunity"
          value={formatINR(monthlyCombinedSavings)}
          icon={<TrendingDown size={18} />}
          accent="green"
          sub="Estimated downtime avoided"
        />
      </div>

      <SectionCard
        title="IoT Retrofit Investment & Payback Period"
        subtitle="Plug-and-play non-invasive sensor kits convert legacy machines into smart assets without equipment replacement"
        icon={<ShieldCheck size={16} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Sensor Kit & Gateway Cost (₹)
            </label>
            <input
              type="number"
              value={retrofitCost}
              onChange={(e) => setRetrofitCost(Number(e.target.value) || 0)}
              step={10000}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 tabular-nums font-semibold"
            />
            <p className="text-[11px] text-slate-400">Includes 12 vibration/temp pods & industrial edge gateway.</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-center">
            <p className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">Estimated Payback Period</p>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1 tabular-nums">{paybackMonths} Months</p>
            <p className="text-xs text-emerald-800 mt-1">₹{formatNumber(retrofitCost)} ÷ {formatINR(monthlyCombinedSavings)}/mo</p>
          </div>

          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/70 text-center">
            <p className="text-xs font-semibold uppercase text-brand-800 tracking-wider">3-Year Projected ROI</p>
            <p className="text-3xl font-extrabold text-brand-700 mt-1 tabular-nums">{threeYearROI}%</p>
            <p className="text-xs text-brand-800 mt-1">Net Gain: {formatINR((monthlyCombinedSavings * 36) - retrofitCost)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Downtime Financial Impact Calculator" icon={<Calculator size={16} />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <InputField label="Downtime duration" value={downtimeHours} onChange={(v) => { setDowntimeHours(v); updateAll({ downtimeHours: v, productionRate, contributionMargin: margin }); }} suffix="hours" />
          <InputField label="Production rate" value={productionRate} onChange={(v) => { setProductionRate(v); updateAll({ downtimeHours, productionRate: v, contributionMargin: margin }); }} suffix="units/hr" />
          <InputField label="Contribution margin per unit" value={margin} onChange={(v) => { setMargin(v); updateAll({ downtimeHours, productionRate, contributionMargin: v }); }} suffix="₹/unit" />
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <CalcRow label="Affected production" value={`${formatNumber(affectedProduction)} units`} />
          <div className="sm:border-l border-slate-200 sm:pl-6">
            <CalcRow label="Estimated financial loss" value={formatINR(contributionLoss)} tone="red" bold />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Resolution Tracker"
        subtitle="Progress on assigned maintenance issues and addressed downtime exposure"
        icon={<CheckCircle size={16} />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TrackerStat label="Open work orders" value={formatNumber(openOrders.length)} />
          <TrackerStat label="Awaiting confirmation" value={formatNumber(awaitingOrders.length)} />
          <TrackerStat label="Resolved" value={formatNumber(resolvedOrders.length)} />
          <TrackerStat label="Downtime exposure addressed" value={formatINR(impactAddressed)} hint="Machine downtime hours × rate × margin" />
        </div>
      </SectionCard>
    </div>
  );
}

function CalcRow({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: 'red' | 'amber';
  bold?: boolean;
}) {
  const toneClass =
    tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-800';
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-600 font-medium">{label}:</span>
      <span className={`tabular-nums ${bold ? 'text-xl font-bold' : 'text-sm font-semibold'} ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 focus:bg-white tabular-nums font-medium transition-all"
        />
        <span className="text-xs text-slate-400 w-16 shrink-0 font-medium">{suffix}</span>
      </div>
    </div>
  );
}

function TrackerStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
