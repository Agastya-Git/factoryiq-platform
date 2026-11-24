# FactoryIQ — Production Deployment Guide

This guide ensures that the **deployed version of FactoryIQ behaves and looks 100% identical to your localhost version**, retaining:
- All **50 machines** with their live telemetry, threshold classifiers, and ML failure scores.
- All **17 work orders** with realistic SLA deadlines (e.g. `overdue by 4h 15m`), history, and resolution notes.
- All **22 central warehouse inventory items** and spare part stocks.
- All **21 users & passwords** across Admin, Station Supervisors, and Maintenance Workers with seamless cross-tab login and one-click auto-fill.
- **Unified Single-Origin Architecture**: The backend serves both the React production frontend and the API from the exact same port/domain. This completely eliminates CORS issues, port mismatches, and authentication timeouts.

---

## Deployment Options

### Option 1: Render (Recommended — Quickest & Easiest)

Render can build and run both the React frontend and FastAPI backend in a single web service.

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare production deployment"
   git push origin main
   ```
2. **In Render Dashboard ([dashboard.render.com](https://dashboard.render.com)):**
   - Click **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repository (`factoryiq-platform` or similar).
   - Configure the following settings:
     - **Name:** `factoryiq`
     - **Region:** Any (e.g. Singapore, Frankfurt, or Oregon)
     - **Branch:** `main`
     - **Runtime:** `Python 3`
     - **Build Command:**
       ```bash
       pip install -r requirements.txt && npm ci --prefix project && npm run build --prefix project
       ```
     - **Start Command:**
       ```bash
       uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1
       ```
     - **Instance Type:** Free or Starter
   - **Environment Variables (Optional):**
     - `APP_ENV` = `production`
     - `ENABLE_API_DOCS` = `true`
3. Click **Create Web Service**.
4. Once deployment finishes, open your `https://your-service.onrender.com` URL. The full platform will load immediately.

---

### Option 2: Railway (Zero-Configuration)

Railway automatically detects our `Dockerfile` and `Procfile`.

1. Go to [railway.app](https://railway.app) and click **New Project**.
2. Select **Deploy from GitHub repo** and choose your repository.
3. Railway automatically builds the container using our `Dockerfile` and deploys it.
4. In Railway project settings, click **Generate Domain** to get your public HTTPS URL.

---

### Option 3: Docker (Run Anywhere)

A production-ready `Dockerfile` and `docker-compose.yml` are included in the repository.

1. **Build and run locally or on any cloud VPS (AWS, GCP, DigitalOcean):**
   ```bash
   docker compose up --build -d
   ```
2. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Retained Database & Credentials

Because `factoryiq.db` is whitelisted in `.gitignore`, the database is committed directly with the repository. When deployed, all data is preserved.

| Role | Username | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Factory Admin** | `admin` *(or `manager`)* | `Admin#Factory99` | Plant-Wide (all 50 machines, fleet financial risk, inventory) |
| **Supervisor (Station B)** | `supervisor.b` | `Pressing@StnB2` | Forming & Pressing (Machines M14–M25, worker dispatch) |
| **Supervisor (Station A)** | `supervisor.a` | `Machining@StnA1` | Machining & Fabrication (Machines M01–M13) |
| **Supervisor (Station C)** | `supervisor.c` | `Assembly@StnC3` | Robotic Assembly & Welding (Machines M26–M38) |
| **Supervisor (Station D)** | `supervisor.d` | `Finishing@StnD4` | Finishing & Packaging (Machines M39–M50) |
| **Worker (Station B)** | `manoj.b` *(or `manoj`)* | `Manoj@501` | Worker portal, SOP checklist, task execution |
| **Worker (Station A)** | `ravi.a` *(or `ravi`)* | `Ravi@401` | Worker portal, SOP checklist, task execution |

> [!TIP]
> On the login page, you can simply click the **"Auto-fill"** button to instantly populate credentials for any role.
