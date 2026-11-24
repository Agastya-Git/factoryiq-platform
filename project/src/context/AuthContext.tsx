import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Manager, Session, Supervisor, Worker } from '@/types';
import { demoManager, demoSupervisors, demoWorkers } from '@/data/demoData';
import { loadSession, saveSession } from '@/utils/storage';
import { loginApi } from '@/utils/api';

interface AuthValue {
  session: Session | null;
  user: Manager | Supervisor | Worker | null;
  login: (usernameOrEmail: string, password: string, role?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  updateUserAvailability?: (available: boolean) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [dynamicUser, setDynamicUser] = useState<any>(null);

  const login = useCallback(async (usernameOrEmail: string, password: string, role?: string) => {
    const rawUser = (usernameOrEmail || '').trim().toLowerCase();
    const rawPwd = (password || '').trim();

    if (!rawUser || !rawPwd) {
      return { ok: false as const, error: 'Please enter both username and password.' };
    }

    try {
      const res = await loginApi(rawUser, rawPwd, role);
      if (!res.ok || !res.user) {
        return { ok: false as const, error: 'Invalid username or password.' };
      }

      const u = res.user;
      const normRole = u.role === 'manager' ? 'admin' : u.role;
      if (role && normRole !== role) {
        return { ok: false as const, error: `These credentials belong to the ${normRole} portal.` };
      }

      const sess: Session = {
        userId: u.id,
        role: normRole,
        username: u.username,
        name: u.name,
        stationId: u.stationId,
        supervisorId: u.supervisorId,
        specialization: u.specialization,
        available: u.available,
      };
      saveSession(sess);
      setSession(sess);
      setDynamicUser({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email || `${u.username}@factoryiq.demo`,
        jobTitle: normRole === 'admin' ? 'Plant Admin' : (normRole === 'supervisor' ? `Supervisor (${u.stationId})` : (u.specialization || 'Maintenance Specialist')),
        role: normRole,
        stationId: u.stationId,
        stationName: u.stationId ? `Station ${u.stationId}` : 'Plant-Wide',
        specialization: u.specialization,
        available: u.available,
        skills: ['mechanical', 'electrical'],
        shift: 'Morning',
      });
      return { ok: true as const };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const lowerMsg = msg.toLowerCase();
      const isNetworkError = lowerMsg.includes('failed to fetch') || lowerMsg.includes('networkerror');
      return {
        ok: false as const,
        error: isNetworkError
          ? 'Cannot reach the FactoryIQ backend. Restart it from the same project folder as the website, then try again.'
          : msg || 'Invalid username or password.',
      };
    }
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setSession(null);
    setDynamicUser(null);
  }, []);

  const updateUserAvailability = useCallback((available: boolean) => {
    setSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, available };
      saveSession(updated);
      return updated;
    });
    setDynamicUser((prev: any) => (prev ? { ...prev, available } : prev));
  }, []);

  const user = useMemo(() => {
    if (!session) return null;
    if (dynamicUser && dynamicUser.id === session.userId) return dynamicUser;

    if (session.role === 'admin' || session.role === 'manager') {
      return {
        ...demoManager,
        id: session.userId,
        name: session.name || demoManager.name,
        username: session.username || 'admin',
      };
    }
    if (session.role === 'supervisor') {
      const match = demoSupervisors.find((s) => s.id === session.userId);
      if (match) return match;
      return {
        id: session.userId,
        name: session.name || 'Station Supervisor',
        username: session.username || session.userId,
        email: `${session.username || session.userId}@factoryiq.demo`,
        jobTitle: `Supervisor (${session.stationId || 'A'})`,
        stationId: session.stationId || 'A',
        stationName: `Station ${session.stationId || 'A'}`,
      };
    }
    // Worker
    const match = demoWorkers.find((w) => w.id === session.userId);
    if (match) {
      return {
        ...match,
        available: session.available ?? match.available,
        specialization: session.specialization || match.specialization || 'Mechanical Maintenance',
      };
    }
    return {
      id: session.userId,
      name: session.name || 'Factory Worker',
      username: session.username || session.userId,
      email: `${session.username || session.userId}@factoryiq.demo`,
      jobTitle: session.specialization || 'Maintenance Specialist',
      skills: ['mechanical', 'electrical'],
      specialization: session.specialization || 'Mechanical Maintenance',
      shift: 'Morning',
      available: session.available ?? true,
      stationId: session.stationId,
    };
  }, [session, dynamicUser]);

  const value = useMemo(
    () => ({ session, user, login, logout, updateUserAvailability }),
    [session, user, login, logout, updateUserAvailability]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
