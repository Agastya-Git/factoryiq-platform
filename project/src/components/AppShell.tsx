import { useState, useEffect } from 'react';
import { fetchHealthCheck } from '@/utils/api';
import {
  LayoutDashboard,
  Cpu,
  TrendingDown,
  Factory,
  X,
  ClipboardList,
  Bell,
  LogOut,
  RotateCcw,
  Layers,
  Users,
  Shield,
  HardHat,
  ChevronRight,
  Boxes
} from 'lucide-react';
import type { PageId } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useFactory } from '@/context/FactoryContext';

interface ShellProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export function AppShell({ current, onNavigate, children }: ShellProps) {
  const { factory, unreadNoticeCount, resetDemo } = useFactory();
  const { user, session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealthCheck().then(setApiOnline);
    const interval = setInterval(() => {
      fetchHealthCheck().then(setApiOnline);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const isSupervisor = session?.role === 'supervisor';
  const supervisorStation = isSupervisor && user && 'stationId' in user ? user.stationId : null;
  const supervisorStationName = isSupervisor && user && 'stationName' in user ? user.stationName : '';

  const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard; desc: string }[] = isSupervisor
    ? [
        { id: 'overview', label: 'Station Overview', icon: LayoutDashboard, desc: `Station ${supervisorStation} machines` },
        { id: 'machines', label: 'Machine Telemetry', icon: Cpu, desc: 'Live sensors & diagnostics' },
        { id: 'workorders', label: 'Work Orders', icon: ClipboardList, desc: 'Assign & verify repairs' },
        { id: 'inventory', label: 'Station Spares', icon: Boxes, desc: 'Spare parts & tooling stock' },
        { id: 'team', label: 'Station Workers', icon: Users, desc: 'Worker team & availability' },
        { id: 'notices', label: 'Notices', icon: Bell, desc: 'Station alerts & updates' },
      ]
    : [
        { id: 'overview', label: 'Factory Overview', icon: LayoutDashboard, desc: 'Fleet summary & OEE' },
        { id: 'machines', label: 'Machine Monitoring', icon: Cpu, desc: '50-machine ML diagnostics' },
        { id: 'business', label: 'Business Impact', icon: TrendingDown, desc: 'ROI & Rupees at Risk' },
        { id: 'workorders', label: 'Work Orders', icon: ClipboardList, desc: 'Approval & supervisor flow' },
        { id: 'inventory', label: 'Central Inventory', icon: Boxes, desc: 'Warehouse & spare parts' },
        { id: 'team', label: 'Lines & Team', icon: Users, desc: 'Supervisors, workers & lines' },
        { id: 'notices', label: 'Notices', icon: Bell, desc: 'Critical alerts & logs' },
      ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-transform duration-300 border-r border-slate-800 shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Factory size={22} />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-white font-black text-lg leading-tight tracking-tight">Factory</span>
                <span className="text-amber-400 font-black text-lg leading-tight tracking-tight">IQ</span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-extrabold tracking-widest uppercase">
                {isSupervisor ? `Supervisor (Stn ${supervisorStation})` : 'Factory Admin'}
              </p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isSupervisor ? `Station ${supervisorStation} Line Portal` : 'Plant Operations Portal'}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white font-medium'
                }`}
              >
                <Icon size={18} className={`shrink-0 ${active ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'}`} />
                <div className="text-left min-w-0 flex-1">
                  <p className={`leading-tight ${active ? 'text-slate-950' : ''}`}>{item.label}</p>
                  <p className={`text-[11px] truncate ${active ? 'text-slate-900/80 font-semibold' : 'text-slate-400'}`}>
                    {item.desc}
                  </p>
                </div>
                {item.id === 'notices' && unreadNoticeCount > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    active ? 'bg-slate-950 text-amber-400' : 'bg-rose-500 text-white'
                  }`}>
                    {unreadNoticeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="px-4 py-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
              {isSupervisor ? <Users size={16} /> : <Shield size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {isSupervisor ? `Station ${supervisorStation} Supervisor` : 'Factory Admin (Meera Shah)'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={logout}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <LogOut size={13} /> Sign out
            </button>
            <button
              onClick={() => {
                if (window.confirm('Reset all demo state to defaults?')) resetDemo();
              }}
              title="Reset data"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-50">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-800"
                onClick={() => setMobileOpen(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <p className="text-sm font-bold text-slate-900">{factory.name}</p>
                <p className="text-xs text-slate-500">
                  {isSupervisor
                    ? `Station ${supervisorStation} Line Operations (${supervisorStationName})`
                    : 'Factory Admin Portal • Full Plant Oversight'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isSupervisor && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                  <Layers size={14} className="text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">
                    Station {supervisorStation}: {supervisorStationName}
                  </span>
                </div>
              )}

              {apiOnline !== null && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shadow-sm"
                  style={{
                    backgroundColor: apiOnline ? '#ecfdf5' : '#fef2f2',
                    borderColor: apiOnline ? '#a7f3d0' : '#fecaca',
                    color: apiOnline ? '#065f46' : '#991b1b'
                  }}
                  title={apiOnline ? 'FastAPI Backend & ML Models active at http://localhost:8001' : 'Backend unreachable'}
                >
                  <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span>{apiOnline ? 'FastAPI + ML Live' : 'Backend Offline'}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
