import { useState, useEffect } from 'react';
import {
  HardHat,
  Users,
  Shield,
  Activity,
  Settings,
  ArrowRight,
  Package,
  Layers,
  AlertTriangle,
  Clock,
  LineChart
} from 'lucide-react';
import cncMachineImg from '@/assets/cnc_machine_hero.jpg';
import roboticsImg from '@/assets/robotics_assembly_arm.jpg';
import heavyIndustryImg from '@/assets/heavy_industry_plant.jpg';

const HERO_IMAGES = [cncMachineImg, roboticsImg, heavyIndustryImg];

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'supervisor' | 'worker') => void;
}

export function LandingPage({ onSelectRole }: LandingPageProps) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans selection:bg-amber-500 selection:text-white">
      
      {/* ── HERO SECTION WITH REAL FACTORY MACHINERY PHOTOGRAPH ── */}
      <div className="relative bg-[#f8f9fa] border-b border-slate-200/80 overflow-hidden min-h-[580px] sm:min-h-[640px] flex flex-col justify-between">
        
        {/* Right side: Real High Resolution Industrial Machinery & Factory Floor Photo with Soft Gradient Blend */}
        <div className="absolute top-0 right-0 w-full sm:w-8/12 lg:w-7/12 h-full pointer-events-none z-0 overflow-hidden">
          <img
            key={currentImgIndex}
            src={HERO_IMAGES[currentImgIndex]}
            alt="Real Industrial Factory Machinery"
            className="w-full h-full object-cover object-center brightness-[0.98] contrast-[1.08] transition-opacity duration-1000"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 12%, black 35%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 12%, black 35%)'
            }}
          />
          {/* Subtle warm base gradient to blend with the bottom feature strip */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8f9fa] to-transparent pointer-events-none" />
        </div>

        {/* Top Header / Navigation Bar */}
        <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          {/* Logo (Factory silhouette with smoke & signal waves) */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#252527] flex items-center justify-center text-white shadow-sm shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 21V10l6 4V10l6 4V4h4v17H4z" />
                <path d="M19 1a3 3 0 0 1 3 3h-1.5a1.5 1.5 0 0 0-1.5-1.5V1z" fill="#f59e0b" />
                <path d="M19 2.5a1.5 1.5 0 0 1 1.5 1.5H19v-1.5z" fill="#f59e0b" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#252527]">Factory</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#f59e0b]">IQ</span>
              </div>
              <p className="text-[8px] sm:text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase leading-none mt-0.5">
                PREDICT . PREVENT . PERFORM.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-bold text-slate-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <a href="#about" className="hover:text-amber-400 transition-colors">About</a>
            <span className="text-slate-300/60 hidden sm:inline">|</span>
            <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
            <span className="text-slate-300/60 hidden sm:inline">|</span>
            <a href="#technology" className="hover:text-amber-400 transition-colors">Technology</a>
          </nav>
        </header>

        {/* Hero Content Area */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14 sm:py-16 lg:py-20 flex-1 flex flex-col justify-center">
          <div className="max-w-xl space-y-5">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#fed7aa] text-[#78350f] text-[11px] font-black uppercase tracking-wider shadow-sm">
              <span>INDUSTRIAL OPERATIONS PLATFORM</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-[#252527] tracking-tight leading-[1.1]">
              Your Factory.<br />
              Smarter Operations.<br />
              <span className="text-[#f59e0b]">Powered by AI.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-md">
              Monitor, predict and prevent machine failures with real-time insights and intelligent automation.
            </p>

            {/* ── 3 Action Login Cards / Buttons (Exact Layout) ── */}
            <div className="pt-2 max-w-md space-y-3">
              {/* Row 1: Factory Worker & Supervisor side-by-side cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Worker Card */}
                <button
                  onClick={() => onSelectRole('worker')}
                  className="bg-white hover:bg-amber-50/60 text-slate-900 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/90 shadow-md hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#d97706] shrink-0 group-hover:scale-105 transition-transform">
                      <HardHat className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Factory Worker
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">Login</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </button>

                {/* Supervisor Card */}
                <button
                  onClick={() => onSelectRole('supervisor')}
                  className="bg-white hover:bg-amber-50/60 text-slate-900 rounded-xl p-3.5 flex items-center justify-between border border-slate-200/90 shadow-md hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Supervisor
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">Login</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </button>
              </div>

              {/* Row 2: Full-width Factory Admin Login */}
              <button
                onClick={() => onSelectRole('admin')}
                className="w-full bg-[#1e2430] hover:bg-[#151a24] text-white rounded-xl p-3.5 sm:p-4 flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-xl font-bold text-xs sm:text-sm tracking-wide group"
              >
                <Shield className="w-4 h-4 text-slate-300" />
                <span>Factory Admin Login</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── FEATURE STRIP (Exact 4 Items from Image 1) ── */}
      <section className="bg-[#fafafc] border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            
            {/* Real-Time Monitoring */}
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-8 h-8 flex items-center justify-center text-slate-800 shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="12" width="4" height="9" rx="1" />
                  <rect x="10" y="7" width="4" height="14" rx="1" />
                  <rect x="17" y="3" width="4" height="18" rx="1" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                Real-Time<br />Monitoring
              </p>
            </div>

            {/* Predictive Maintenance */}
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-8 h-8 flex items-center justify-center text-[#d97706] shrink-0">
                <Shield className="w-6 h-6 stroke-[2.2]" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                Predictive<br />Maintenance
              </p>
            </div>

            {/* Smart Inventory Management */}
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-8 h-8 flex items-center justify-center text-[#d97706] shrink-0">
                <Package className="w-6 h-6 stroke-[2.2]" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                Smart Inventory<br />Management
              </p>
            </div>

            {/* Rupees at Risk Analytics */}
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-8 h-8 rounded-full bg-[#fed7aa] flex items-center justify-center text-[#78350f] font-black text-sm shrink-0">
                ₹
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                Rupees at Risk<br />Analytics
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION: BUILT FOR MODERN FACTORIES (Exact Image 1) ── */}
      <section id="features" className="py-20 bg-[#fdfcfa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Centered Pill */}
          <div className="inline-flex items-center px-4 py-1 rounded-full bg-[#fef3c7] text-[#92400e] text-xs font-black uppercase tracking-wider mb-4">
            <span>Smarter. Safer. More Efficient.</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#252527] tracking-tight">
            Built for Modern Factories
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base font-normal">
            From AI-powered predictions to automated work orders — everything you need for uninterrupted production.
          </p>

          {/* 3 Value Cards */}
          <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#fed7aa] flex items-center justify-center text-[#78350f] mb-6">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#252527] mb-2.5">
                Predict Failures Early
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Leverage Isolation Forest &amp; XGBoost to detect anomalies and estimate remaining useful life (RUL).
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#fed7aa] flex items-center justify-center text-[#78350f] mb-6">
                <Settings className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#252527] mb-2.5">
                Automate Maintenance
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Get smart work orders, check spare parts, and route tasks to the right technician.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#fed7aa] flex items-center justify-center text-[#78350f] mb-6">
                <Shield className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#252527] mb-2.5">
                Ensure Safety &amp; Minimize Downtime
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Track real-time risk and reduce operational losses.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION: COMPLETE PLANT OVERVIEW (Exact Image 1) ── */}
      <section id="technology" className="py-20 bg-[#ecebf0]/60 relative overflow-hidden">
        {/* Subtle decorative gear watermark */}
        <div className="absolute -left-16 top-10 opacity-[0.07] pointer-events-none">
          <svg width="340" height="340" viewBox="0 0 100 100" fill="#0f172a">
            <path d="M50 35a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
            <path d="M90 45h-6.3a34 34 0 0 0-3.3-8l4.5-4.5a3 3 0 0 0 0-4.2l-4.2-4.2a3 3 0 0 0-4.2 0L72.3 28.6a34 34 0 0 0-8-3.3V19a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6.3a34 34 0 0 0-8 3.3l-4.5-4.5a3 3 0 0 0-4.2 0l-4.2 4.2a3 3 0 0 0 0 4.2l4.5 4.5a34 34 0 0 0-3.3 8H19a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6.3a34 34 0 0 0 3.3 8l-4.5 4.5a3 3 0 0 0 0 4.2l4.2 4.2a3 3 0 0 0 4.2 0l4.5-4.5a34 34 0 0 0 8 3.3V90a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6.3a34 34 0 0 0 8-3.3l4.5 4.5a3 3 0 0 0 4.2 0l4.2-4.2a3 3 0 0 0 0-4.2l-4.5-4.5a34 34 0 0 0 3.3-8H90a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#fed7aa] text-[#78350f] text-xs font-black uppercase tracking-wider">
                <span>Real-Time Intelligence</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-[#252527] tracking-tight">
                Complete Plant Overview
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                Monitor all 50 machines across 4 production stations with live telemetry, SHAP insights, and OEE analytics.
              </p>

              <div>
                <button
                  onClick={() => onSelectRole('admin')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Right Column: Floating Live Plant Overview Card (Exact Replica) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-7">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#252527] flex items-center justify-center text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 21V10l6 4V10l6 4V4h4v17H4z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">Plant Overview</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live · 3s ago</span>
                  </div>
                </div>

                {/* 4 Metrics in light boxes */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3 my-5">
                  <div className="bg-[#f8f9fa] border border-slate-100 rounded-xl p-3 text-center">
                    <Layers className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black text-[#252527]">50</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total Machines</p>
                  </div>

                  <div className="bg-[#f8f9fa] border border-slate-100 rounded-xl p-3 text-center">
                    <AlertTriangle className="w-4 h-4 text-[#ea580c] mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black text-[#ea580c]">2</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">At Risk</p>
                  </div>

                  <div className="bg-[#f8f9fa] border border-slate-100 rounded-xl p-3 text-center">
                    <Clock className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black text-[#252527]">4.2h</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Downtime Today</p>
                  </div>

                  <div className="bg-[#f8f9fa] border border-slate-100 rounded-xl p-3 text-center">
                    <LineChart className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black text-[#252527]">98.7%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">OEE</p>
                  </div>
                </div>

                {/* Split: OEE Trend & Top Risk Machines */}
                <div className="grid sm:grid-cols-12 gap-5 pt-2">
                  
                  {/* Left: OEE Trend Line Graph */}
                  <div className="sm:col-span-7 bg-[#f8f9fa] rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">OEE Trend</span>
                      <span className="text-[11px] font-black text-[#78350f] bg-[#fed7aa] px-2 py-0.5 rounded-full">
                        98.7%
                      </span>
                    </div>

                    {/* SVG Curve */}
                    <div className="h-28 w-full mt-2">
                      <svg className="w-full h-full" viewBox="0 0 300 90" fill="none" preserveAspectRatio="none">
                        <line x1="0" y1="15" x2="300" y2="15" stroke="#e2e8f0" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="300" y2="50" stroke="#e2e8f0" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="300" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
                        <text x="0" y="14" fill="#94a3b8" fontSize="8" fontWeight="bold">100%</text>
                        <text x="0" y="49" fill="#94a3b8" fontSize="8" fontWeight="bold">75%</text>
                        <text x="0" y="79" fill="#94a3b8" fontSize="8" fontWeight="bold">50%</text>

                        {/* Trend path */}
                        <path
                          d="M40,58 L90,44 L140,52 L190,32 L240,22 L280,16"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        {/* Area gradient under path */}
                        <polygon
                          points="40,58 90,44 140,52 190,32 240,22 280,16 280,85 40,85"
                          fill="#f59e0b"
                          fillOpacity="0.15"
                        />
                        {/* Points */}
                        <circle cx="40" cy="58" r="3.5" fill="#f59e0b" />
                        <circle cx="90" cy="44" r="3.5" fill="#f59e0b" />
                        <circle cx="140" cy="52" r="3.5" fill="#f59e0b" />
                        <circle cx="190" cy="32" r="3.5" fill="#f59e0b" />
                        <circle cx="240" cy="22" r="3.5" fill="#f59e0b" />
                        <circle cx="280" cy="16" r="4.5" fill="#d97706" />
                      </svg>
                    </div>

                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1 px-4">
                      <span>8AM</span>
                      <span>12PM</span>
                      <span>4PM</span>
                      <span>8PM</span>
                    </div>
                  </div>

                  {/* Right: Top Risk Machines */}
                  <div className="sm:col-span-5 bg-[#f8f9fa] rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Top Risk Machines
                    </span>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/80">
                        <span className="font-bold text-[#dc2626] flex items-center gap-1.5">
                          ▲ M07
                        </span>
                        <span className="font-bold text-slate-900">92%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/80">
                        <span className="font-bold text-[#ea580c] flex items-center gap-1.5">
                          ● M23
                        </span>
                        <span className="font-bold text-slate-900">67%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-bold text-[#d97706] flex items-center gap-1.5">
                          ● M41
                        </span>
                        <span className="font-bold text-slate-900">54%</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL-TO-ACTION BANNER (Exact Image 1) ── */}
      <section className="bg-[#1e2430] text-white py-14 relative overflow-hidden">
        {/* Decorative gear outline */}
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <svg width="220" height="220" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 35a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
            <path d="M90 45h-6.3a34 34 0 0 0-3.3-8l4.5-4.5a3 3 0 0 0 0-4.2l-4.2-4.2a3 3 0 0 0-4.2 0L72.3 28.6a34 34 0 0 0-8-3.3V19a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6.3a34 34 0 0 0-8 3.3l-4.5-4.5a3 3 0 0 0-4.2 0l-4.2 4.2a3 3 0 0 0 0 4.2l4.5 4.5a34 34 0 0 0-3.3 8H19a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6.3a34 34 0 0 0 3.3 8l-4.5 4.5a3 3 0 0 0 0 4.2l4.2 4.2a3 3 0 0 0 4.2 0l4.5-4.5a34 34 0 0 0 8 3.3V90a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6.3a34 34 0 0 0 8-3.3l4.5 4.5a3 3 0 0 0 4.2 0l4.2-4.2a3 3 0 0 0 0-4.2l-4.5-4.5a34 34 0 0 0 3.3-8H90a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] text-[11px] font-black uppercase tracking-wider mb-2">
              <span>Join the Smart Factory Revolution</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Need help with factory operations?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Get support, raise a work order or check system status.
            </p>
          </div>

          <button
            onClick={() => onSelectRole('admin')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black bg-[#f59e0b] hover:bg-[#d97706] text-[#1e2430] transition-all shadow-lg hover:scale-105 shrink-0"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#151a24] border-t border-slate-800 text-slate-500 py-6 text-xs text-center">
        <p>© 2026 FactoryIQ. Industrial Operations &amp; Predictive Maintenance Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
