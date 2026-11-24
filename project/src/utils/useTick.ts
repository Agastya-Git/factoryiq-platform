import { useEffect, useState } from 'react';

/** Re-renders the caller every `ms` so relative times ("due in 3h") stay fresh. */
export function useTick(ms = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
