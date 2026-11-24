import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'navy';
  sub?: string;
  trend?: ReactNode;
}

const accentMap = {
  blue: { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'ring-brand-100' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
  navy: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' },
};

export function KpiCard({ label, value, icon, accent = 'navy', sub, trend }: KpiCardProps) {
  const a = accentMap[accent];
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-[26px] leading-tight font-bold text-slate-800 mt-1.5 tabular-nums tracking-tight">
            {value}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-lg ${a.bg} ${a.text} flex items-center justify-center ring-4 ${a.ring}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{trend}</p>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const map = {
    normal: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'Normal' },
    warning: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'Warning' },
    critical: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', text: 'Critical' },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {label ?? m.text}
    </span>
  );
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, icon, children, actions, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-card ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-brand-600">{icon}</span>}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {actions}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: 'green' | 'amber' | 'red' | 'blue';
}

export function ProgressBar({ value, max, tone = 'blue' }: ProgressBarProps) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const toneMap = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-brand-500',
  };
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${toneMap[tone]} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}
