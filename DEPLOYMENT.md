# FactoryIQ production deployment

FactoryIQ deploys as one always-on Render web service that serves both the
React site and FastAPI API from the same HTTPS origin. PostgreSQL is a separate
managed resource so application data survives deploys and restarts. The API is
kept to one instance and one worker because the five-second telemetry
simulator runs inside the API process.

The Render Blueprint is `render.yaml`. It expects an existing Render Postgres
resource named `factoryiq-production`; this ordering is deliberate so the API
cannot start against an empty database and seed over the imported system.

## What is retained

The one-time SQLite-to-PostgreSQL migration copies all application tables,
including machines, telemetry history, work orders and timelines, notices,
users and password hashes, inventory, and stations. Keep the local database
and a separate backup until cloud counts and behavior have been checked.
Never commit `factoryiq.db`, backups, `.env`, or credential files.

## Deployment sequence

### 1. Create the persistent database

In Render, create a PostgreSQL database named exactly `factoryiq-production`,
in the **Singapore** region. Choose a paid plan (the 0.5 CPU / 1 GB plan is a
reasonable starting point for this data size) and review the current monthly
price shown by Render before creating it. Wait until its status is Available.

For the one-time import, copy its **external** connection URL. Keep that URL
private. If Render requires an IP allowlist for external connections, allow
your current IP only, then remove that temporary rule after import. The
deployed service will use the private internal URL automatically through
`render.yaml`.

### 2. Freeze and back up the local database

Stop the local backend with **Ctrl+C** so telemetry stops writing. Make a
separate copy of `factoryiq.db` outside the repository. Keep the original and
backup unchanged.

### 3. Import the local data

Open PowerShell in the repository folder and run the following. PowerShell
prompts you for the external database URL without echoing it:

```powershell
$secureUrl = Read-Host "Paste the external PostgreSQL URL" -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $secureUrl).Password
python scripts\migrate_sqlite_to_postgres.py --source factoryiq.db
Remove-Item Env:DATABASE_URL
$secureUrl.Dispose()
```

Proceed only if the script reports **Migration completed** and prints matching
source and destination counts for every table. It reads SQLite in read-only
mode, requires an empty PostgreSQL destination, and refuses to overwrite
existing application rows. If it fails, keep both local copies and do not
deploy the web service yet.

### 4. Create the Render service from the Blueprint

Open Render's **New + → Blueprint** flow and select the private GitHub
repository `Agastya-Git/factoryiq-platform`, branch `main`, and its root
`render.yaml`. The Blueprint references the already-created database by name.
Review the proposed service and the paid compute plan before applying it.

The service builds the frontend and backend together, sets `APP_ENV=production`,
connects to the managed database, and starts one Uvicorn worker. Do not add a
second instance: each instance would create another telemetry simulator loop.

### 5. Verify before cutover

When Render reports the service as Live, open its `onrender.com` URL and check:

1. `/api/health` reports `online`, `postgresql`, and `database_connected: true`.
2. The login page loads at the same origin and a known account signs in.
3. Machine statuses, telemetry history, work-order assignments/history,
   notices, inventory counts, and stations match the migration report.
4. A new telemetry reading appears; then restart the service and confirm normal
   writes still persist in PostgreSQL.

Do not import over a non-empty database or test destructive changes on the
production dataset. Retain the local SQLite backup until you have confirmed
Render's backup/restore path.

## Deployment configuration

- Region: Singapore for the web service and database.
- Web plan: 1 CPU / 2 GB RAM to accommodate the ML stack and live API.
- Database: paid persistent PostgreSQL; 0.5 CPU / 1 GB is a reasonable start.
- Health check: `/api/health`.
- One web instance and one worker; telemetry ticks every five seconds.
- Frontend requests use same-origin `/api/...` URLs, so no hosted CORS URL or
  separate frontend service configuration is required.

Current Render plans and prices can change; confirm the recurring charge in
Render before applying the Blueprint.
