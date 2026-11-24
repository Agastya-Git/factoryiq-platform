export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatKwh(value: number): string {
  return `${formatNumber(value)} kWh`;
}

export function formatKw(value: number): string {
  return `${formatNumber(value, 1)} kW`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

export function formatUnitsPerHour(value: number): string {
  return `${formatNumber(value)} units/hr`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** "due in 3h 20m" / "overdue by 4h 15m" / "overdue by 2h" */
export function formatDue(
  iso?: string,
  createdAt?: string,
  priority?: string,
  now = Date.now()
): { text: string; overdue: boolean; hours: number } {
  let dueMs = iso && iso.trim() ? Date.parse(iso) : NaN;

  // If dueAt is missing or invalid, calculate target from createdAt + standard SLA
  if (!Number.isFinite(dueMs)) {
    const createdMs = createdAt && createdAt.trim() ? Date.parse(createdAt) : NaN;
    if (Number.isFinite(createdMs)) {
      // SLA: High/Critical = 2h, Medium = 4h, Low = 8h
      const slaHours = priority === 'High' || priority === 'Critical' ? 2 : priority === 'Low' ? 8 : 4;
      dueMs = createdMs + slaHours * 3600000;
    } else {
      // Fallback: 2 hours ago
      dueMs = now - 2 * 3600000;
    }
  }

  const diffMs = dueMs - now;
  const diffMin = Math.round(diffMs / 60000);
  const absMin = Math.abs(diffMin);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;

  // Build clean hours + minutes string, e.g. "4h 15m" or "2h" or "45m"
  const span = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

  if (diffMin >= 0) {
    return { text: `due in ${span}`, overdue: false, hours: h };
  } else {
    return { text: `overdue by ${span}`, overdue: true, hours: h };
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
