# FactoryIQ — Transforming Legacy Factories into Intelligent Facilities

> **Category:** Software / Smart Automation  
> **Domain / Theme:** Industry 4.0, Smart Manufacturing & Industrial IoT Analytics

> **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md) for production hosting and the guarded migration of the current local database.

FactoryIQ modernizes legacy manufacturing plants without requiring multi-crore machinery overhauls or physical plant shutdowns. By retrofitting existing equipment with low-cost, non-invasive IoT telemetry sensors (vibration, temperature, power draw), FactoryIQ delivers real-time plant visibility, automated anomaly detection, statistical predictive maintenance, line bottleneck resolution, and financial loss quantification.

---

## 🛠️ The Tech Stack (100% Adherence)

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts, Lucide | Operational dashboards, real-time charts, role-based workflows, and executive reporting |
| **Backend API** | FastAPI (Python 3.13), Uvicorn | High-performance asynchronous REST API with Swagger documentation at `/docs` |
| **Machine Learning** | Scikit-learn, XGBoost, SHAP, Pandas, NumPy | Rolling statistical feature engineering, Isolation Forest anomaly scoring, XGBoost failure risk prediction, and SHAP explainability |
| **Database** | PostgreSQL 18 (SQLAlchemy ORM + psycopg2) | Persistent relational store for machines, work orders, telemetry, and audit logs with zero-crash fallback |

---

## 🚀 Quick Start (One-Click Launch)

### Run Everything Together
Double-click **`start_all.bat`** in the project root. This opens both the backend and frontend in separate terminals:
* **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
* **FastAPI Swagger Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
* **PostgreSQL Database:** Database name `factoryiq` on port 5432

### Or Run Manually in Two Terminals:
**Terminal 1 (Backend API):**
```powershell
.\start_backend.bat
```

**Terminal 2 (Frontend Dashboard):**
```powershell
.\start_frontend.bat
```

---

## 🧠 Machine Learning & Predictive Analytics Pipeline

```
[Raw Telemetry Stream (Vib, Temp, Power)]
                   │
                   ▼
[1. Rolling Feature Engineering (Pandas)]
   • Rolling Mean, Volatility (Std), Peak (Max), Threshold Deviations
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
[2. Isolation Forest]    [3. XGBoost Classifier]
   • Unsupervised           • Supervised Failure Risk %
   • Anomaly Score          • E.g. M17 at 78% risk
   • Low/Moderate/Severe    • Calibrated multi-sensor envelope
         │                   │
         └─────────┬─────────┘
                   ▼
[4. SHAP TreeExplainer (Explainable AI)]
   • Feature attribution waterfall (e.g. Vibration +38%, Temp +29%)
   • Plain-English diagnosis: "Incubating spindle bearing wear"
   • Remaining Useful Life (RUL) estimation
```

---

## 🏭 Core Dashboard Modules

1. **Factory Overview Dashboard:**
   * Full fleet health (50 total machines: 41 Normal, 6 Warning, 3 Critical).
   * **Plant OEE Benchmark:** Availability (91.8%) × Performance (95.2%) × Quality (99.5%) = 87.0% Overall OEE.
   * Top critical operational exceptions and one-click printable **Executive Plant Audit Report**.
2. **Machine Telemetry & Predictive Maintenance:**
   * Deep-dive sensor charts (12-hour history for Temperature, Vibration, Power Draw).
   * Isolation Forest Anomaly Score badge & XGBoost Failure Risk gauge.
   * Interactive **SHAP Factor Waterfall** and RUL hours countdown.
3. **Production Line Bottleneck Detection:**
   * 4-station sequential flow: Station A (100) → Station B (95) → Station C (48) → Station D (90).
   * **WIP Buffer Dynamics:** Visualizes Buffer B→C congestion (320 units piling up) vs Buffer C→D starvation.
   * **"What-If" Line Balancing Simulator:** Interactive throughput slider predicting volume and financial recovery.
4. **Energy Monitoring & Inefficiency Tracking:**
   * Power draw benchmarking: Machine M03 consuming 41 kW vs 17 kW reference (2.4× waste).
   * **ESG Carbon Footprint:** Excess energy converted into Metric Tons $CO_2$ ($0.82\text{ kg } CO_2/\text{kWh}$) and tree offset equivalents.
5. **Business Loss & Financial Impact Calculator:**
   * Quantifies engineering inefficiencies into monetary terms: Downtime Loss (₹45,000/mo), Energy Waste (₹12,000/mo), Monthly Savings Opportunity (₹57,000/mo).
   * **IoT Retrofit Payback Calculator:** Non-invasive sensor kit (₹1,50,000) pays back in **2.6 Months** (356% 1-year ROI).

---

## 👥 Role-Based Collaboration Workflow

* **Plant Manager (Meera Shah):** Full plant oversight, assigns work orders to technicians, confirms resolutions, and views executive loss reports.
* **Line Supervisor (Arjun Mehta):** Focused station-level operational control for Station C assembly line.
* **Shopfloor Technicians (Ravi Kumar, Priya Nair):** Receives assigned work orders, verifies shopfloor quality & safety checklist (LOTO safety, bearing inspection, re-lubrication, telemetry test), and notifies the manager upon completion.

---

## 📁 Repository Directory Structure

```text
factoryiq-with-roles/
├── backend/                  # FastAPI & ML Python Service
│   ├── database.py           # SQLAlchemy ORM models & PostgreSQL connection
│   ├── main.py               # FastAPI REST endpoints & CORS
│   ├── ml_engine.py          # Isolation Forest, XGBoost & SHAP pipeline
│   └── requirements.txt      # Python dependencies
├── project/                  # React Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/       # AppShell, Modals, Badges, Work Orders
│   │   ├── context/          # AuthContext & FactoryContext (global sync)
│   │   ├── data/             # Initial fleet data & thresholds
│   │   ├── pages/            # 5 Core modules + Login, Notices, Tasks
│   │   ├── utils/            # Calculations, API client, ML analytics, OEE
│   │   └── types.ts          # Central TypeScript interfaces
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration
├── start_all.bat             # One-click launch for both Backend & Frontend
├── start_backend.bat         # Launch FastAPI server
├── start_frontend.bat        # Launch React dashboard
└── README.md                 # Project documentation
```
