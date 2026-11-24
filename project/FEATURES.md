# FactoryIQ — Roles, Work Orders & Notices

## Demo accounts (password for all: `demo123`)
| Role | Email |
|---|---|
| Manager (Meera Shah) | manager@factoryiq.demo |
| Mechanical Technician (Ravi Kumar) | ravi@factoryiq.demo |
| Electrician (Priya Nair) | priya@factoryiq.demo |
| Production Supervisor (Arjun Mehta) | arjun@factoryiq.demo |
| Mechanical Technician (Sneha Iyer) | sneha@factoryiq.demo |
| Electrician, off shift (Imran Sheikh) | imran@factoryiq.demo |
| Maintenance Lead (Kavita Rao) | kavita@factoryiq.demo |

## Demo script (two browser tabs, same browser)
1. Tab 1: sign in as the manager. Overview -> **Assign** on "M17". The modal suggests Ravi (mechanical, on shift, 0 open tasks).
2. Tab 2: sign in as Ravi. The task appears. **Start work**, then **Mark as solved** with a note.
3. Tab 1: the **Notices** badge updates live. Open Notices -> **Confirm resolved** (or **Reopen** with a reason).
4. Overview counts, the Critical Issues list, Work Orders and the Business Impact "Resolution Tracker" all update.

The session is kept per tab (sessionStorage) so each tab can be a different user. Shared data is
kept in localStorage and synced between tabs through the `storage` event. **Reset** (manager sidebar) clears it.

## Where things live
- `src/utils/storage.ts` – the only file that touches localStorage. Replace `loadShared/saveShared` (and the
  `storage` listener in `FactoryContext`) with Supabase/FastAPI calls to go multi-device.
- `src/context/FactoryContext.tsx` – all rules: issue generation, work-order lifecycle, role checks.
  Role rules are enforced here (workers only see their own orders and cannot create/confirm orders), not just in the UI.
- `src/utils/issues.ts` – derives assignable issues from live data; worker suggestion logic.
- `src/components/AssignModal.tsx`, `src/pages/WorkOrdersPage.tsx`, `NoticesPage.tsx`, `WorkerTasksPage.tsx`, `LoginPage.tsx`.

## Lifecycle
assigned -> in progress -> awaiting confirmation (worker marked solved) -> resolved (manager confirms).
The manager can reopen (back to in progress, with a reason) or reassign. Only manager confirmation clears the
machine/station/energy issue from the dashboard.

## Notes
- Demo login is client-side only. Do not treat it as real security.
- Status rules now also use stoppage history: 5+ events or 10+ downtime hours = critical, 4+ events = warning.
  This makes the live counts match the spec (3 critical / 6 warning / 41 normal) and M17 shows 78% risk.
- Energy machine IDs are normalised to M01–M04 to match the machine list.
