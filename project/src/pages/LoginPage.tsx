import { useState, type FormEvent } from 'react';
import {
  Factory,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Users,
  HardHat,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginPageProps {
  initialRole?: 'admin' | 'supervisor' | 'worker';
  onBack?: () => void;
}

export function LoginPage({ initialRole = 'admin', onBack }: LoginPageProps) {
  const { login } = useAuth();
  const [role, setRole] = useState<'admin' | 'supervisor' | 'worker'>(initialRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole: 'admin' | 'supervisor' | 'worker') => {
    setRole(newRole);
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your email or username.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(username.trim(), password, role);
      if (!res.ok) {
        setError(res.error || 'Incorrect email or password');
      }
    } catch (err: any) {
      setError(err?.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    if (role === 'admin') return 'Admin Sign In';
    if (role === 'supervisor') return 'Supervisor Sign In';
    return 'Worker Sign In';
  };

  return (
    <div className="min-h-screen bg-slate-100/90 relative flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* ── Top-Left Industrial Graphic Accents (Matches Image 2) ── */}
      <div className="absolute top-0 left-0 w-80 h-32 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 320 120" fill="none">
          {/* Dark Charcoal polygon */}
          <polygon points="0,0 260,0 210,60 0,60" fill="#1e293b" />
          {/* Amber stripe along lower border */}
          <polygon points="0,60 210,60 190,82 0,82" fill="#f59e0b" />
          <polygon points="210,60 260,0 280,0 230,60" fill="#f59e0b" />
        </svg>
      </div>

      {/* ── Bottom-Right Industrial Graphic Accents (Matches Image 2) ── */}
      <div className="absolute bottom-0 right-0 w-80 h-32 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 320 120" fill="none">
          {/* Dark Charcoal polygon */}
          <polygon points="60,120 320,120 320,60 110,60" fill="#1e293b" />
          {/* Amber stripe */}
          <polygon points="110,60 320,60 320,38 130,38" fill="#f59e0b" />
          <polygon points="60,120 110,60 90,60 40,120" fill="#f59e0b" />
        </svg>
      </div>

      {/* ── Decorative Subtle Cog / Gear Watermarks (Left & Right) ── */}
      <div className="absolute -left-20 top-1/3 opacity-[0.06] pointer-events-none">
        <svg width="340" height="340" viewBox="0 0 100 100" fill="#0f172a">
          <path d="M50 35a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
          <path d="M90 45h-6.3a34 34 0 0 0-3.3-8l4.5-4.5a3 3 0 0 0 0-4.2l-4.2-4.2a3 3 0 0 0-4.2 0L72.3 28.6a34 34 0 0 0-8-3.3V19a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6.3a34 34 0 0 0-8 3.3l-4.5-4.5a3 3 0 0 0-4.2 0l-4.2 4.2a3 3 0 0 0 0 4.2l4.5 4.5a34 34 0 0 0-3.3 8H19a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6.3a34 34 0 0 0 3.3 8l-4.5 4.5a3 3 0 0 0 0 4.2l4.2 4.2a3 3 0 0 0 4.2 0l4.5-4.5a34 34 0 0 0 8 3.3V90a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6.3a34 34 0 0 0 8-3.3l4.5 4.5a3 3 0 0 0 4.2 0l4.2-4.2a3 3 0 0 0 0-4.2l-4.5-4.5a34 34 0 0 0 3.3-8H90a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3z" />
        </svg>
      </div>

      <div className="absolute -right-24 bottom-1/4 opacity-[0.06] pointer-events-none">
        <svg width="380" height="380" viewBox="0 0 100 100" fill="#0f172a">
          <path d="M50 35a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
          <path d="M90 45h-6.3a34 34 0 0 0-3.3-8l4.5-4.5a3 3 0 0 0 0-4.2l-4.2-4.2a3 3 0 0 0-4.2 0L72.3 28.6a34 34 0 0 0-8-3.3V19a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6.3a34 34 0 0 0-8 3.3l-4.5-4.5a3 3 0 0 0-4.2 0l-4.2 4.2a3 3 0 0 0 0 4.2l4.5 4.5a34 34 0 0 0-3.3 8H19a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6.3a34 34 0 0 0 3.3 8l-4.5 4.5a3 3 0 0 0 0 4.2l4.2 4.2a3 3 0 0 0 4.2 0l4.5-4.5a34 34 0 0 0 8 3.3V90a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6.3a34 34 0 0 0 8-3.3l4.5 4.5a3 3 0 0 0 4.2 0l4.2-4.2a3 3 0 0 0 0-4.2l-4.5-4.5a34 34 0 0 0 3.3-8H90a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3z" />
        </svg>
      </div>

      {/* ── Main Centered Card Container ── */}
      <div className="w-full max-w-md relative z-10">

        {/* Back Button (if onBack provided) */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Selection</span>
          </button>
        )}

        {/* Role Switcher Tabs */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl mb-4 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              role === 'admin'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('supervisor')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              role === 'supervisor'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('worker')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              role === 'worker'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Worker</span>
          </button>
        </div>

        {/* The Card (Exact Image 2 Style) */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          {/* Logo Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 mb-3">
              <Factory className="w-7 h-7" />
            </div>

            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black tracking-tight text-slate-900">Factory</span>
              <span className="text-2xl font-black tracking-tight text-amber-500">IQ</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
              {getRoleTitle()}
            </h2>

            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Industrial Operations &amp; Predictive Maintenance Platform
            </p>
          </div>

          {/* ── Error Banner (Matches Image 2) ── */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-700 flex items-center gap-2.5 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'admin' ? 'Enter admin username or email' : role === 'supervisor' ? 'Enter supervisor username' : 'Enter worker username'}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button (Bright Amber - Exact Image 2 Style) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 hover:shadow-lg transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Sub-actions */}
            <div className="flex items-center justify-between text-xs pt-1 text-slate-500 font-medium">
              <span className="text-slate-400">
                Authorized Personnel Only
              </span>
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact plant administration or refer to ADMIN_SUPERVISOR_CREDENTIALS.md for authorized login details.");
                }}
                className="hover:text-amber-600 transition-colors"
              >
                Need help?
              </a>
            </div>
          </form>

        </div>

      </div>

    </div>
  );
}
