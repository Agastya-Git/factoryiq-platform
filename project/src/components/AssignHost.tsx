import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CriticalIssue } from '@/types';
import { AssignModal } from '@/components/AssignModal';

const AssignContext = createContext<(issue: CriticalIssue) => void>(() => {});

/** Mount once for the manager app; any page can call useAssign()(issue) to open the modal. */
export function AssignProvider({ children }: { children: ReactNode }) {
  const [issue, setIssue] = useState<CriticalIssue | null>(null);
  return (
    <AssignContext.Provider value={setIssue}>
      {children}
      {issue && <AssignModal issue={issue} onClose={() => setIssue(null)} />}
    </AssignContext.Provider>
  );
}

export function useAssign() {
  return useContext(AssignContext);
}
