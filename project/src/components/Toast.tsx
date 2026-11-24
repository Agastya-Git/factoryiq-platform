import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-[min(92vw,22rem)]" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-elevated border text-sm animate-fade-in ${
              t.kind === 'success'
                ? 'bg-white border-emerald-200 text-slate-700'
                : 'bg-white border-red-200 text-slate-700'
            }`}
          >
            {t.kind === 'success' ? (
              <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-300 hover:text-slate-500"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
