# FactoryIQ deployment and data migration

This deployment keeps the existing React UI and FastAPI behavior, and moves the
current SQLite database into persistent PostgreSQL. Do not start the hosted API
against an empty database before the import: the API seeds a baseline dataset
when it sees an empty user table.

## What gets migrated

The active local database is `factoryiq.db`. The migration script copies every
application table (machines, all telemetry history, work orders and timelines,
notices and read states, users and password hashes, inventory and stock levels,
and stations) and prints the source/destination row counts for verification.
Telemetry continues to grow while the local simulator is running, so the report
from the frozen database is the authoritative snapshot.

The script opens SQLite read-only,
refuses a non-PostgreSQL target, refuses a target containing application rows,
and does not call the API startup seeding or telemetry hooks.

## 1. Freeze and back up local data

1. Close the backend terminal with **Ctrl+C** so telemetry and other writes stop.
2. In the project folder, make a separate backup outside the folder that will be
   pushed as source code. Keep the original `factoryiq.db` unchanged.
3. Do not include `factoryiq.db`, `.env`, or any backup in a source repository.
   The root `.gitignore` excludes these files and the local plaintext credential
   directory.

## 2. Create a private source repository

This workspace is not currently a Git repository. Create a **private** GitHub
repository, then from Command Prompt in the project root:

```cmd
git init
git add -A
git status --short
```

Before committing, make sure the staged list does not include `.env`,
`factoryiq.db`, any database backup, or `ADMIN_SUPERVISOR_CREDENTIALS.md`. Then
commit and connect the private repository:

```cmd
git commit -m "Prepare FactoryIQ deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_PRIVATE_REPO.git
git push -u origin main
```

Replace the repository URL with the one GitHub gives you. Connect Render to this
private repository so it can build the frontend and backend.

## 3. Create persistent PostgreSQL

Create a paid Render Postgres database. Use the database's external connection
URL only for the one-time import from your computer; use its internal connection
URL for the deployed backend. Keep both URLs private.

## 4. Import the existing database before deploying the API

From Command Prompt, in the project root, run:

```cmd
cd /d "C:\Users\Agasthya Shetty\Downloads\factoryiq-with-roles"
powershell -NoProfile
```

In the PowerShell window, enter the external PostgreSQL URL securely and run the
copy. `Read-Host -AsSecureString` masks the URL as you type. The value is held
only in that PowerShell session and removed after the script exits.

```powershell
$secureUrl = Read-Host "Paste the external PostgreSQL URL" -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $secureUrl).Password
python scripts\migrate_sqlite_to_postgres.py --source factoryiq.db
Remove-Item Env:DATABASE_URL
$secureUrl.Dispose()
```

Continue only if the script prints **Migration completed** and all counts. If it
stops with an error, do not start the API; keep the local database and backup as
they are and resolve the reported schema/target issue first. The script will not
overwrite a non-empty cloud database.

## 5. Deploy the backend as a single instance

Create a Render Web Service from the repository root with:

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1`
- Health check path: `/api/health`
- `DATABASE_URL`: PostgreSQL **internal** connection URL
- `APP_ENV`: `production` (disables silent SQLite fallback if PostgreSQL is unavailable)
- `ALLOWED_ORIGINS`: the exact deployed frontend origin, such as
  `https://your-factoryiq-site.onrender.com`
- `ENABLE_API_DOCS`: `true` if you want `/docs` as on localhost

Use one backend instance and one worker. The app starts its five-second
simulated telemetry loop inside the API process; multiple processes would run
multiple loops. Use an always-on service so the stream continues while the site
is idle.

## 6. Deploy the frontend

Create a Render Static Site with the repository's `project` directory as its
root:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Build environment variable `VITE_API_BASE_URL`: the backend's public HTTPS
  origin, with no trailing slash

After Render assigns the static site's URL, set the backend's
`ALLOWED_ORIGINS` to that exact origin (scheme and host, no path or trailing
slash) and redeploy the backend. Until this is set, browser API calls from the
hosted frontend can be blocked by CORS.

The frontend build uses the same React application. The API URL setting only
changes where its requests go; local Vite still uses the existing proxy and
localhost defaults.

## 7. Verify the cloud copy before cutover

Check the migration counts against the output from the script. Then verify the
hosted `/api/health`, sign in with a real account, and inspect machine statuses,
recent telemetry, work-order assignments and history, notices, and inventory.
Make one reversible test change in a non-production copy first if you need to
confirm writes. After cutover, confirm a new telemetry row and an ordinary data
change remain after a service restart. Keep the original SQLite backup until a
restore from the hosted database backup has been verified.

Do not run the app against a new empty cloud database and expect it to restore
the live data automatically; the explicit migration in step 3 is what carries
that data over.
