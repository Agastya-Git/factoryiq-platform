import os
import sys
from pathlib import Path

# Ensure repository root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# ── Load .env from repo root ────────────────────────────────────────────────
_env_path = Path(parent_dir) / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

import json
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query, Header, Path as ApiPath
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text

from backend.database import (
    init_db,
    get_db,
    SessionLocal,
    MachineModel,
    WorkOrderModel,
    NoticeModel,
    TelemetryHistoryModel,
    StationModel,
    UserModel,
    InventoryItemModel,
    make_password_hash,
    verify_password,
    engine,
)
from backend.ml_engine import ml_pipeline
from backend.risk import estimate_rupees_at_risk
from backend.telemetry_generator import seed_50_machines, reconcile_legacy_simulator_data, start_background_stream

# Initialize database schema and migrations
init_db()

# ── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

_docs_enabled = os.getenv("ENABLE_API_DOCS", "true").lower() not in ("false", "0", "no")

app = FastAPI(
    title="FactoryIQ Smart Manufacturing API",
    description="Industry 4.0 Backend: Role-Based Work Order Tracking, AI Anomaly Detection, XGBoost Predictive Maintenance, Dynamic Production Lines.",
    version="2.1.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------- Pydantic Schemas ----------

class TelemetryPoint(BaseModel):
    time: str = Field(..., max_length=30)
    temperature: float = Field(..., ge=-50, le=500)
    vibration: float   = Field(..., ge=0,   le=100)
    power: float       = Field(..., ge=0,   le=1000)

class PredictRequest(BaseModel):
    machine_id:      str = Field(..., max_length=20)
    telemetry:       List[Dict[str, Any]] = Field(default=[], max_length=60)
    thresholds:      Dict[str, float] = {}
    downtime_events: int   = Field(0, ge=0, le=10_000)
    downtime_hours:  float = Field(0.0, ge=0, le=100_000)

class LoginRequest(BaseModel):
    username: str = Field(..., max_length=100)
    password: str = Field(..., max_length=100)
    role:     Optional[str] = None

class StationCreate(BaseModel):
    id:          Optional[str] = Field(None, max_length=50)
    name:        str           = Field(..., max_length=100)
    description: Optional[str] = Field("", max_length=200)

class SupervisorCreate(BaseModel):
    name:       str = Field(..., max_length=100)
    username:   str = Field(..., max_length=100)
    password:   str = Field(..., max_length=100)
    station_id: str = Field(..., max_length=50)

class WorkerCreate(BaseModel):
    name:           str           = Field(..., max_length=100)
    username:       str           = Field(..., max_length=100)
    password:       str           = Field(..., max_length=100)
    specialization: str           = Field(..., max_length=100)
    station_id:     Optional[str] = Field(None, max_length=50)
    supervisor_id:  Optional[str] = Field(None, max_length=50)

class WorkerAvailabilityUpdate(BaseModel):
    available: bool

class WorkOrderCreate(BaseModel):
    issue_key:               str            = Field(..., max_length=100)
    source:                  str            = Field("machine", max_length=20)
    machine_id:              Optional[str]  = Field(None, max_length=50)
    station_id:              Optional[str]  = Field(None, max_length=50)
    title:                   str            = Field(..., max_length=200)
    detail:                  str            = Field(..., max_length=2000)
    action:                  str            = Field(..., max_length=2000)
    severity:                str            = Field("warning", max_length=20)
    priority:                str            = Field("Medium",  max_length=20)
    specialization_required: Optional[str]  = Field(None, max_length=100)
    spare_parts:             Optional[str]  = Field("", max_length=1000)
    safety_instructions:     Optional[str]  = Field("", max_length=1000)
    assignee_id:             Optional[str]  = Field(None, max_length=50)
    supervisor_id:           Optional[str]  = Field(None, max_length=50)
    assigned_by_id:          Optional[str]  = Field(None, max_length=50)
    manager_note:            str            = Field("",        max_length=1000)
    due_at:                  str            = Field("",        max_length=50)

class AdminAssignSupervisorRequest(BaseModel):
    supervisor_id: str           = Field(..., max_length=50)
    manager_note:  Optional[str] = Field("", max_length=1000)

class SupervisorAssignWorkerRequest(BaseModel):
    worker_id: str           = Field(..., max_length=50)
    note:      Optional[str] = Field("", max_length=1000)

class WorkerUpdateRequest(BaseModel):
    action:         str           = Field(..., max_length=50) # 'accept', 'reject', 'start', 'block', 'resolve'
    note:           Optional[str] = Field("", max_length=1000)
    blocked_reason: Optional[str] = Field("", max_length=1000)
    repair_notes:   Optional[str] = Field("", max_length=2000)
    parts_used: List[Dict[str, Any]] = Field(default_factory=list, max_length=20)

class SupervisorVerifyCloseRequest(BaseModel):
    verified:           bool
    verification_notes: str = Field(..., max_length=1000)

class DirectMachineResolveRequest(BaseModel):
    note: str = Field("", max_length=1000)

class StatusUpdate(BaseModel):
    status: str            = Field(..., max_length=50)
    by:     str            = Field(..., max_length=50)
    byName: str            = Field(..., max_length=100)
    note:   Optional[str]  = Field("", max_length=1000)

class InventoryItemCreate(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(..., max_length=80)
    station_id: str = Field("ALL", max_length=20)
    compatible_machines: Optional[List[str]] = []
    stock_level: int = Field(10, ge=0)
    min_threshold: int = Field(5, ge=0)
    unit_cost_inr: float = Field(1500.0, ge=0)
    location_bin: str = Field("Bin A-01", max_length=100)
    lead_time_days: int = Field(2, ge=0)
    supplier: Optional[str] = Field("FactoryIQ Industrial Supplies", max_length=150)

class InventoryRestockRequest(BaseModel):
    quantity: int = Field(..., gt=0)
    note: Optional[str] = Field("", max_length=500)

class InventoryConsumeRequest(BaseModel):
    quantity: int = Field(1, gt=0)
    work_order_id: Optional[str] = None
    note: Optional[str] = Field("", max_length=500)

class AutoAssignRequest(BaseModel):
    machine_id: str = Field(..., max_length=50)
    title: Optional[str] = Field(None, max_length=200)
    detail: Optional[str] = Field(None)
    severity: Optional[str] = Field("warning", max_length=20)
    priority: Optional[str] = Field("High", max_length=20)

# ---------- Helper to get effective role & station from headers/query ----------

def get_auth_context(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_station: Optional[str] = Header(None, alias="X-User-Station"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    role_param: Optional[str] = Query(None, alias="role"),
    station_param: Optional[str] = Query(None, alias="station"),
    user_id_param: Optional[str] = Query(None, alias="userId"),
):
    role = (role_param or x_user_role or "").lower()
    if role == "manager":
        role = "admin"
    station = station_param or x_user_station
    user_id = user_id_param or x_user_id
    return {"role": role, "station": station, "userId": user_id}

# ---------- Auth Endpoints ----------

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    identifier = (req.username or "").strip().lower()
    plain_password = (req.password or "").strip()
    
    if not identifier or not plain_password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    
    # 1. Search by username or email
    user = db.query(UserModel).filter(
        or_(
            UserModel.username.ilike(identifier),
            UserModel.email.ilike(identifier)
        )
    ).first()

    # Fallback to common aliases and station-less usernames
    if not user:
        if identifier in ("manager", "admin@factoryiq.demo", "admin@factoryiq.com", "manager@factoryiq.com"):
            user = db.query(UserModel).filter(UserModel.id == "MGR01").first()
        elif "." not in identifier:
            candidates = db.query(UserModel).filter(UserModel.username.ilike(f"{identifier}.%")).all()
            if len(candidates) == 1:
                user = candidates[0]
            elif len(candidates) > 1:
                for c in candidates:
                    if verify_password(plain_password, c.password_hash):
                        user = c
                        break

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # 2. Strict password verification
    if not verify_password(plain_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # 3. Resolve authorized role
    user_role = "admin" if user.role in ("manager", "admin") else user.role

    return {
        "ok": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "role": user_role,
            "stationId": user.station_id,
            "supervisorId": user.supervisor_id,
            "specialization": user.specialization,
            "available": user.available,
        }
    }

# ---------- Station Endpoints ----------

@app.get("/api/stations")
def list_stations(db: Session = Depends(get_db)):
    stations = db.query(StationModel).order_by(StationModel.id.asc()).all()
    # If empty, seed default stations
    if not stations:
        default_stations = [
            ("A", "Station A - Machining & Fabrication", "Precision CNC lathes, milling, boring, hobbing and primary fabrication (M01 - M13)."),
            ("B", "Station B - Forming & Pressing", "Heavy stamping, hydraulic presses, moulding, and forming operations (M14 - M25)."),
            ("C", "Station C - Robotic Assembly & Welding", "Automated robotic arms, spot/laser welding cells, and conveyor transfer (M26 - M38)."),
            ("D", "Station D - Finishing, Inspection & Packaging", "Automated optical inspection, curing ovens, powder coating, and dispatch packaging (M39 - M50).")
        ]
        for s_id, s_name, s_desc in default_stations:
            db.add(StationModel(id=s_id, name=s_name, description=s_desc))
        db.commit()
        stations = db.query(StationModel).order_by(StationModel.id.asc()).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "createdAt": s.created_at.isoformat() if s.created_at else datetime.utcnow().isoformat()
        }
        for s in stations
    ]

@app.post("/api/stations")
def create_station(data: StationCreate, db: Session = Depends(get_db)):
    station_id = (data.id or "").strip().upper()
    if not station_id:
        count = db.query(StationModel).count()
        station_id = chr(ord('A') + count) if count < 26 else f"LINE-{count+1}"

    existing = db.query(StationModel).filter(StationModel.id == station_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Station with ID '{station_id}' already exists.")

    new_station = StationModel(
        id=station_id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else "",
        created_at=datetime.utcnow()
    )
    db.add(new_station)
    db.commit()
    db.refresh(new_station)
    return {
        "ok": True,
        "station": {
            "id": new_station.id,
            "name": new_station.name,
            "description": new_station.description,
            "createdAt": new_station.created_at.isoformat()
        }
    }

# ---------- Supervisor & Worker Management Endpoints ----------

@app.get("/api/supervisors")
def list_supervisors(db: Session = Depends(get_db)):
    supervisors = db.query(UserModel).filter(UserModel.role == "supervisor").all()
    stations_map = {s.id: s.name for s in db.query(StationModel).all()}

    return [
        {
            "id": s.id,
            "username": s.username,
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "stationId": s.station_id,
            "stationName": stations_map.get(s.station_id, f"Station {s.station_id}"),
            "createdAt": s.created_at.isoformat() if s.created_at else datetime.utcnow().isoformat()
        }
        for s in supervisors
    ]

@app.post("/api/supervisors")
def create_supervisor(data: SupervisorCreate, db: Session = Depends(get_db)):
    # Check username unique
    existing = db.query(UserModel).filter(UserModel.username == data.username.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Check station exists
    station = db.query(StationModel).filter(StationModel.id == data.station_id).first()
    if not station:
        raise HTTPException(status_code=400, detail=f"Station '{data.station_id}' does not exist.")

    sup_id = f"SUP_{data.station_id}_{secrets.token_hex(2).upper()}"
    new_sup = UserModel(
        id=sup_id,
        username=data.username.strip().lower(),
        name=data.name.strip(),
        email=f"{data.username.strip().lower()}@factoryiq.demo",
        role="supervisor",
        station_id=data.station_id,
        available=True,
        password_hash=make_password_hash(data.password),
        created_at=datetime.utcnow()
    )
    db.add(new_sup)
    db.commit()
    return {"ok": True, "id": sup_id, "username": new_sup.username, "stationId": new_sup.station_id}

@app.get("/api/workers")
def list_workers(
    station_id: Optional[str] = Query(None),
    supervisor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    query = db.query(UserModel).filter(UserModel.role == "worker")

    # If supervisor is querying, enforce their station
    if auth["role"] == "supervisor" and auth["station"]:
        query = query.filter(UserModel.station_id == auth["station"])
    elif station_id:
        query = query.filter(UserModel.station_id == station_id)

    if supervisor_id:
        query = query.filter(UserModel.supervisor_id == supervisor_id)

    workers = query.all()
    stations_map = {s.id: s.name for s in db.query(StationModel).all()}

    return [
        {
            "id": w.id,
            "username": w.username,
            "name": w.name,
            "email": w.email,
            "role": w.role,
            "stationId": w.station_id,
            "stationName": stations_map.get(w.station_id, f"Station {w.station_id}"),
            "supervisorId": w.supervisor_id,
            "specialization": w.specialization or "General Maintenance",
            "available": bool(w.available),
            "createdAt": w.created_at.isoformat() if w.created_at else datetime.utcnow().isoformat()
        }
        for w in workers
    ]

@app.post("/api/workers")
def create_worker(
    data: WorkerCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    existing = db.query(UserModel).filter(UserModel.username == data.username.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Inherit station and supervisor from logged-in supervisor if available
    station_id = auth.get("station") or data.station_id
    supervisor_id = auth.get("userId") or data.supervisor_id

    if not station_id:
        raise HTTPException(status_code=400, detail="Station ID is required.")

    valid_specs = [
        "Mechanical Maintenance",
        "Electrical Maintenance",
        "Instrumentation & Controls",
        "Robotics & Automation",
        "HVAC & Utilities",
        "General Maintenance"
    ]
    if data.specialization not in valid_specs:
        data.specialization = "General Maintenance"

    w_id = f"W_{station_id}_{secrets.token_hex(2).upper()}"
    new_worker = UserModel(
        id=w_id,
        username=data.username.strip().lower(),
        name=data.name.strip(),
        email=f"{data.username.strip().lower()}@factoryiq.demo",
        role="worker",
        station_id=station_id,
        supervisor_id=supervisor_id,
        specialization=data.specialization,
        available=True,
        password_hash=make_password_hash(data.password),
        created_at=datetime.utcnow()
    )
    db.add(new_worker)
    db.commit()
    return {
        "ok": True,
        "id": w_id,
        "username": new_worker.username,
        "stationId": new_worker.station_id,
        "specialization": new_worker.specialization
    }

@app.patch("/api/workers/{worker_id}/availability")
def toggle_worker_availability(worker_id: str, data: WorkerAvailabilityUpdate, db: Session = Depends(get_db)):
    worker = db.query(UserModel).filter(UserModel.id == worker_id, UserModel.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")
    worker.available = data.available

    # Notify respective supervisor who registered this worker
    if worker.supervisor_id:
        status_text = "AVAILABLE for assignments" if worker.available else "UNAVAILABLE (Off-duty / On-leave)"
        db.add(NoticeModel(
            id=f"NOTIF-AVAIL-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id="SYSTEM",
            kind="worker_availability",
            worker_id=worker.supervisor_id,
            worker_name="Station Supervisor",
            target_role="supervisor",
            station_id=worker.station_id,
            title=f"Worker Availability: {worker.name}",
            message=f"{worker.name} (@{worker.username}, Station {worker.station_id}) updated availability status to: {status_text}."
        ))

    db.commit()
    return {"ok": True, "workerId": worker_id, "available": worker.available}

@app.delete("/api/workers/{worker_id}")
@app.post("/api/workers/{worker_id}/unregister")
def unregister_worker(
    worker_id: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Unregisters / removes a worker from the system.
    Automatically unassigns any active work orders and returns them to the station queue.
    """
    worker = db.query(UserModel).filter(UserModel.id == worker_id, UserModel.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    caller_role = auth.get("role")
    caller_station = auth.get("station")

    # If supervisor, ensure worker belongs to their station
    if caller_role == "supervisor" and caller_station and worker.station_id != caller_station:
        raise HTTPException(status_code=403, detail="Supervisors can only unregister workers from their assigned station.")

    worker_name = worker.name
    worker_station = worker.station_id

    # 1. Safely unassign any work orders assigned to this worker
    active_orders = db.query(WorkOrderModel).filter(WorkOrderModel.assignee_id == worker.id).all()
    now_iso = datetime.utcnow().isoformat()
    for o in active_orders:
        o.assignee_id = None
        if o.status in ("assigned_to_worker", "accepted", "in_progress", "blocked"):
            o.status = "assigned_to_supervisor"
        tl = json.loads(o.timeline_json or "[]")
        tl.append({
            "at": now_iso,
            "by": auth.get("userId") or "supervisor",
            "byName": auth.get("name") or "Station Supervisor",
            "kind": "worker_unregistered",
            "message": f"Worker {worker_name} was unregistered. Work order returned to station queue for reassignment."
        })
        o.timeline_json = json.dumps(tl)

    # 2. Add audit notice
    db.add(NoticeModel(
        id=f"NOTIF-UNREG-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
        work_order_id="SYSTEM",
        kind="worker_unregistered",
        worker_id=auth.get("userId") or "admin",
        worker_name=auth.get("name") or "System Manager",
        target_role="supervisor" if caller_role == "admin" else "admin",
        station_id=worker_station,
        title=f"Worker Unregistered: {worker_name}",
        message=f"{worker_name} ({worker.specialization}, Station {worker_station}) has been unregistered from the factory workforce."
    ))

    # 3. Delete worker record
    db.delete(worker)
    db.commit()

    return {
        "ok": True,
        "message": f"Worker {worker_name} has been successfully unregistered.",
        "unassignedOrdersCount": len(active_orders)
    }

@app.get("/api/admin/hierarchy")
def get_admin_hierarchy(db: Session = Depends(get_db)):
    supervisors = db.query(UserModel).filter(UserModel.role == "supervisor").all()
    workers = db.query(UserModel).filter(UserModel.role == "worker").all()
    stations = db.query(StationModel).all()
    stations_map = {s.id: s.name for s in stations}

    result = []
    for s in supervisors:
        sup_workers = [
            {
                "id": w.id,
                "name": w.name,
                "username": w.username,
                "specialization": w.specialization,
                "available": w.available
            }
            for w in workers if w.supervisor_id == s.id or (not w.supervisor_id and w.station_id == s.station_id)
        ]
        result.append({
            "supervisor": {
                "id": s.id,
                "name": s.name,
                "username": s.username,
                "stationId": s.station_id,
                "stationName": stations_map.get(s.station_id, f"Station {s.station_id}")
            },
            "workers": sup_workers
        })

    return result

# ---------- Machine Monitoring Endpoints (RBAC Enforced) ----------

def classify_machine(machine: MachineModel, thresholds: dict) -> str:
    """One threshold classifier shared by telemetry, repairs, and API views."""
    critical = (
        machine.temperature >= thresholds["tempCritical"]
        or machine.temp_bearing >= thresholds["tempCritical"]
        or machine.temp_motor >= thresholds["tempCritical"]
        or machine.vibration >= thresholds["vibCritical"]
        or machine.power >= thresholds["powerCritical"]
        or (machine.downtime_events or 0) >= 5
        or (machine.downtime_hours or 0) >= 10
    )
    if critical:
        return "critical"
    warning = (
        machine.temperature >= thresholds["tempWarn"]
        or machine.temp_bearing >= thresholds["tempWarn"]
        or machine.temp_motor >= thresholds["tempWarn"]
        or machine.vibration >= thresholds["vibWarn"]
        or machine.power >= thresholds["powerWarn"]
        or (machine.downtime_events or 0) >= 4
    )
    return "warning" if warning else "normal"


def repair_fault_readings(machine: MachineModel) -> dict:
    """Move only out-of-range readings just inside warning limits; return rollback snapshot."""
    thresholds = json.loads(machine.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
    fields = {
        "temperature": ("tempWarn", 2.0),
        "temp_bearing": ("tempWarn", 2.0),
        "temp_motor": ("tempWarn", 2.0),
        "vibration": ("vibWarn", 0.2),
        "power": ("powerWarn", 0.5),
    }
    snapshot = {name: getattr(machine, name) for name in fields}
    snapshot["downtime_events"] = machine.downtime_events
    snapshot["downtime_hours"] = machine.downtime_hours
    for name, (limit, margin) in fields.items():
        if getattr(machine, name) >= thresholds[limit]:
            setattr(machine, name, round(max(0, thresholds[limit] - margin), 2))
    # These are active reporting-period counters. Preserve the old values in
    # the work order snapshot, then start a clean period after the repair.
    machine.downtime_events = 0
    machine.downtime_hours = 0.0
    machine.baseline_json = json.dumps({"temperature": machine.temperature, "temp_bearing": machine.temp_bearing, "temp_motor": machine.temp_motor, "vibration": machine.vibration, "power": machine.power})
    machine.status = classify_machine(machine, thresholds)
    machine.failure_risk = {"normal": 8, "warning": 38, "critical": 68}[machine.status]
    machine.rupees_at_risk = estimate_rupees_at_risk(machine, machine.status, thresholds)
    machine.priority = {"normal": "Low", "warning": "Medium", "critical": "Critical"}[machine.status]
    machine.health_score = {"normal": 94.0, "warning": 72.0, "critical": 45.0}[machine.status]
    machine.updated_at = datetime.utcnow()
    return snapshot


def record_machine_reading(db: Session, machine: MachineModel, timestamp: Optional[datetime] = None) -> None:
    """Append an explicit repair-state sample to the same time-series table."""
    db.add(TelemetryHistoryModel(
        timestamp=timestamp or datetime.utcnow(), machine_id=machine.id, station=machine.station,
        temperature=machine.temperature, temp_bearing=machine.temp_bearing, temp_motor=machine.temp_motor,
        vibration=machine.vibration, power=machine.power, load_pct=machine.load_pct,
        shaft_rpm=machine.shaft_rpm, failure_risk=machine.failure_risk,
        rupees_at_risk=machine.rupees_at_risk, status=machine.status,
    ))


def default_work_order_due_at(created_at: Optional[str], severity: str = "warning", priority: str = "Medium") -> str:
    """Return a real SLA deadline for legacy or newly created orders missing one."""
    sla_hours = 4 if (severity or "").lower() == "critical" or (priority or "").lower() in ("critical", "urgent") else 24
    try:
        created = datetime.fromisoformat((created_at or "").replace("Z", "+00:00"))
        if created.tzinfo is not None:
            created = created.replace(tzinfo=None)
    except (TypeError, ValueError):
        created = datetime.utcnow()
    return (created + timedelta(hours=sla_hours)).isoformat()

@app.get("/api/machines")
def list_machines(
    station: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    # RBAC Enforcement: Supervisor can ONLY access their own station
    if auth["role"] == "supervisor" and auth["station"]:
        if station and station != auth["station"]:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Supervisors are restricted strictly to Station {auth['station']}."
            )
        station = auth["station"]

    query = db.query(MachineModel)
    if station:
        query = query.filter(MachineModel.station == station)

    machines = query.all()
    results = []
    for m in machines:
        thresholds = json.loads(m.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
        if m.type.lower() == "curing" or "oven" in m.name.lower():
            thresholds.update({"tempWarn": 105, "tempCritical": 125, "powerWarn": 38, "powerCritical": 46})
        m.thresholds_json = json.dumps(thresholds)
        measured = classify_machine(m, thresholds)
        m.status = measured
        m.failure_risk = {"normal": 8, "warning": 38, "critical": 68}[measured]
        m.rupees_at_risk = estimate_rupees_at_risk(m, measured, thresholds)
        m.priority = {"normal": "Low", "warning": "Medium", "critical": "Critical"}[measured]
        m.health_score = {"normal": 94.0, "warning": 72.0, "critical": 45.0}[measured]
        if measured == "normal":
            m.recommended_action = "No action required. Current readings are within configured limits; continue routine monitoring."
        elif measured == "critical":
            drivers = []
            if max(m.temperature, m.temp_bearing, m.temp_motor) >= thresholds["tempCritical"]: drivers.append("temperature")
            if m.vibration >= thresholds["vibCritical"]: drivers.append("vibration")
            if m.power >= thresholds["powerCritical"]: drivers.append("power draw")
            m.recommended_action = f"Urgent: isolate and inspect the critical {', '.join(drivers)} fault, then verify readings after repair."
        else:
            m.recommended_action = "Schedule inspection of readings above the warning limit and monitor the next telemetry samples."
        # Fleet polling runs every five seconds. Keep this endpoint cheap and
        # deterministic; the full XGBoost/SHAP analysis is served on demand by
        # the dedicated ML endpoints for a selected machine.
        anomaly_score = {"normal": 0.08, "warning": 0.52, "critical": 0.9}[measured]
        results.append({
            "id": m.id,
            "name": m.name,
            "type": m.type,
            "station": m.station,
            "status": m.status,
            "temperature": m.temperature,
            "tempBearing": m.temp_bearing,
            "tempMotor": m.temp_motor,
            "vibration": m.vibration,
            "power": m.power,
            "loadPct": m.load_pct,
            "shaftRpm": m.shaft_rpm,
            "healthScore": m.health_score,
            "downtimeHours": m.downtime_hours,
            "downtimeEvents": m.downtime_events,
            "failureRisk": m.failure_risk,
            "anomalyScore": anomaly_score,
            "isAnomaly": measured != "normal",
            "rupeesAtRisk": m.rupees_at_risk,
            "priority": m.priority,
            "recommendedAction": m.recommended_action,
            "thresholds": thresholds,
            "primaryShapDriver": m.recommended_action,
            "topFeatures": [],
            "thresholds": thresholds,
            "updatedAt": m.updated_at.isoformat() if m.updated_at else datetime.utcnow().isoformat()
        })
    db.commit()
    return results

@app.post("/api/machines/{machine_id}/resolve")
def resolve_machine_directly(
    machine_id: str,
    data: DirectMachineResolveRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context),
):
    """Record a supervisor's direct resolution in the shared database."""
    if auth["role"] not in ("admin", "supervisor"):
        raise HTTPException(status_code=403, detail="Only a manager or supervisor can resolve a machine directly.")

    machine = db.query(MachineModel).filter(MachineModel.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found.")
    if auth["role"] == "supervisor" and auth["station"] and machine.station != auth["station"]:
        raise HTTPException(status_code=403, detail="Supervisors can only resolve machines in their station.")

    repair_fault_readings(machine)
    record_machine_reading(db, machine)
    machine.recommended_action = "Repair verified by supervisor. Standard continuous monitoring resumed."

    now_iso = datetime.utcnow().isoformat()
    linked_orders = db.query(WorkOrderModel).filter(
        WorkOrderModel.machine_id == machine.id,
        WorkOrderModel.status.notin_(("closed", "resolved", "cancelled")),
    ).all()
    for order in linked_orders:
        order.status = "closed"
        order.resolved_at = now_iso
        order.verification_notes = data.note or "Supervisor resolved the issue directly."
        timeline = json.loads(order.timeline_json or "[]")
        timeline.append({
            "at": now_iso,
            "by": auth.get("userId") or "SUPERVISOR",
            "byName": "Supervisor",
            "kind": "verified_closed",
            "message": order.verification_notes,
        })
        order.timeline_json = json.dumps(timeline)

    db.commit()
    return {"ok": True, "machineId": machine.id, "status": machine.status, "closedWorkOrders": len(linked_orders)}

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database connectivity check failed: {str(exc)}"
        )
    return {
        "status": "online",
        "service": "FactoryIQ Industry 4.0 Backend",
        "database": engine.name,
        "database_connected": True,
        "models": {
            "anomaly_detector": "Isolation Forest (scikit-learn)",
            "failure_classifier": "XGBoost Classifier",
            "explainability": "SHAP (SHapley Additive exPlanations)"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/ml/predict")
def predict_machine_health(req: PredictRequest):
    res = ml_pipeline.analyze_machine(
        machine_id=req.machine_id,
        telemetry=req.telemetry,
        thresholds=req.thresholds,
        downtime_events=req.downtime_events,
        downtime_hours=req.downtime_hours
    )
    return res

@app.get("/api/ml/explain/{machine_id}")
def explain_machine(machine_id: str, db: Session = Depends(get_db)):
    m = db.query(MachineModel).filter(MachineModel.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    telemetry = [
        {"temperature": m.temperature + i * 0.1, "vibration": m.vibration + (i % 2) * 0.05, "power": m.power}
        for i in range(12)
    ]
    thresholds = {"tempWarn": 70, "tempCritical": 85, "vibWarn": 4, "vibCritical": 7, "powerWarn": 18, "powerCritical": 24}
    
    return ml_pipeline.analyze_machine(
        machine_id=m.id,
        telemetry=telemetry,
        thresholds=thresholds,
        downtime_events=m.downtime_events,
        downtime_hours=m.downtime_hours
    )

@app.get("/api/metrics/oee")
def get_oee_metrics():
    availability = 0.918
    performance = 0.952
    quality = 0.995
    overall_oee = round(availability * performance * quality * 100, 1)

    return {
        "overall_oee": overall_oee,
        "availability_pct": round(availability * 100, 1),
        "performance_pct": round(performance * 100, 1),
        "quality_pct": round(quality * 100, 1),
        "world_class_benchmark": 85.0,
        "status": "Operational (Above World-Class)" if overall_oee >= 85.0 else "Action Required"
    }

@app.get("/api/telemetry/history/{machine_id}")
def get_telemetry_history(
    machine_id: str = ApiPath(..., max_length=20),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    records = (
        db.query(TelemetryHistoryModel)
        .filter(TelemetryHistoryModel.machine_id == machine_id)
        .order_by(TelemetryHistoryModel.timestamp.desc())
        .limit(limit)
        .all()
    )
    records.reverse()
    return [
        {
            "time": r.timestamp.strftime("%H:%M:%S"),
            "temperature": r.temperature,
            "temp_bearing": r.temp_bearing,
            "temp_motor": r.temp_motor,
            "vibration": r.vibration,
            "power": r.power,
            "load_pct": r.load_pct,
            "shaft_rpm": r.shaft_rpm,
            "failure_risk": r.failure_risk,
            "rupees_at_risk": r.rupees_at_risk,
            "status": r.status
        }
        for r in records
    ]

# ---------- Work Orders & Workflow (Interconnected Multi-Tier RBAC) ----------

@app.get("/api/workorders")
def list_work_orders(
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    query = db.query(WorkOrderModel)

    # Scoped permissions:
    # 1. Admin: full access
    # 2. Supervisor: only their station
    # 3. Worker: only their assigned tasks
    if auth["role"] == "supervisor" and auth["station"]:
        query = query.filter(WorkOrderModel.station_id == auth["station"])
    elif auth["role"] == "worker" and auth["userId"]:
        query = query.filter(WorkOrderModel.assignee_id == auth["userId"])

    orders = query.order_by(WorkOrderModel.created_at.desc()).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "issueKey": o.issue_key,
            "source": o.source,
            "machineId": o.machine_id,
            "stationId": o.station_id,
            "title": o.title,
            "detail": o.detail,
            "action": o.action,
            "severity": o.severity,
            "priority": o.priority,
            "specializationRequired": o.specialization_required or "General Maintenance",
            "spareParts": o.spare_parts or "Standard Maintenance Kit, Replacement Bearing / Seals",
            "safetyInstructions": o.safety_instructions or "Mandatory LOTO on primary 415V breaker. Wear high-temp thermal gloves.",
            "assigneeId": o.assignee_id,
            "assignedById": o.assigned_by_id,
            "supervisorId": o.supervisor_id,
            "managerNote": o.manager_note,
            "workerNotes": o.worker_notes,
            "blockedReason": o.blocked_reason,
            "verificationNotes": o.verification_notes,
            "status": o.status,
            "createdAt": o.created_at,
            "dueAt": o.due_at or default_work_order_due_at(o.created_at, o.severity, o.priority),
            "resolvedAt": o.resolved_at,
            "impactINR": o.impact_inr,
            "timeline": json.loads(o.timeline_json or "[]"),
            "consumedParts": json.loads(o.consumed_parts_json or "[]")
        })
    return results

@app.post("/api/workorders")
def create_work_order(data: WorkOrderCreate, db: Session = Depends(get_db)):
    # ── DUPLICATE CHECK: Prevent duplicate active work orders for the same machine and fault ──
    if data.machine_id and data.issue_key:
        active_duplicate = db.query(WorkOrderModel).filter(
            WorkOrderModel.machine_id == data.machine_id,
            WorkOrderModel.issue_key == data.issue_key,
            WorkOrderModel.status.notin_(("closed", "resolved", "cancelled"))
        ).first()
        if active_duplicate:
            return {
                "ok": True,
                "id": active_duplicate.id,
                "duplicate_prevented": True,
                "message": f"Active work order {active_duplicate.id} already exists for {data.machine_id} ({data.issue_key})."
            }

    order_id = f"WO-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(3)}"
    now_iso = datetime.utcnow().isoformat()
    
    # Determine initial status
    initial_status = "assigned_to_worker" if data.assignee_id else ("assigned_to_supervisor" if data.supervisor_id else "pending_admin")

    timeline = [{
        "at": now_iso,
        "by": data.assigned_by_id or "AI-System",
        "byName": "FactoryIQ AI Anomaly Engine" if data.source == "ai" else "Plant Operations",
        "kind": "created",
        "message": f"Fault detected: {data.title}. Initial state: {initial_status}."
    }]

    # Infer station from machine if not provided
    station_id = data.station_id
    if not station_id and data.machine_id:
        mach = db.query(MachineModel).filter(MachineModel.id == data.machine_id).first()
        if mach:
            station_id = mach.station

    # Set default spare parts & safety instructions based on title/category
    spare_parts = data.spare_parts
    if not spare_parts:
        if "bearing" in data.title.lower() or "temperature" in data.title.lower():
            spare_parts = "ISO VG 220 Synthetic Grease, Deep-groove 6205 bearing set, contact seals."
        elif "vibration" in data.title.lower() or "shaft" in data.title.lower():
            spare_parts = "Flexible jaw coupling spider, stainless steel shims (0.05-0.5mm), Loctite 243."
        elif "motor" in data.title.lower():
            spare_parts = "Thermal overload relay, cooling fan cowl, Megger insulation test leads."
        else:
            spare_parts = "Standard preventive maintenance service kit, replacement fasteners, solvent cleaner."

    safety_instructions = data.safety_instructions
    if not safety_instructions:
        safety_instructions = "1. Strict Lockout/Tagout (LOTO) on main feeder panel.\n2. Confirm zero electrical and mechanical energy before access.\n3. Wear safety glasses, steel-toe boots, and heat-resistant gloves."

    order = WorkOrderModel(
        id=order_id,
        issue_key=data.issue_key,
        source=data.source,
        machine_id=data.machine_id,
        station_id=station_id,
        title=data.title,
        detail=data.detail,
        action=data.action,
        severity=data.severity,
        priority=data.priority,
        specialization_required=data.specialization_required or "General Maintenance",
        spare_parts=spare_parts,
        safety_instructions=safety_instructions,
        assignee_id=data.assignee_id,
        assigned_by_id=data.assigned_by_id,
        supervisor_id=data.supervisor_id,
        manager_note=data.manager_note,
        status=initial_status,
        created_at=now_iso,
        due_at=data.due_at or default_work_order_due_at(now_iso, data.severity, data.priority),
        timeline_json=json.dumps(timeline)
    )
    db.add(order)

    # ── NOTIFICATIONS ──
    # For critical failures: notify BOTH Admin AND relevant Station Supervisor immediately!
    if data.severity == "critical":
        # Notice to Admin
        admin_notice = NoticeModel(
            id=f"NOTIF-ADM-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order_id,
            kind="critical_escalation",
            worker_id="MGR01",
            worker_name="Factory Admin",
            target_role="admin",
            station_id=station_id,
            title=f"CRITICAL ESCALATION: {data.title} ({data.machine_id or station_id})",
            message=f"Urgent failure detected. Immediate supervisor response and intervention required. Details: {data.detail}"
        )
        db.add(admin_notice)

        # Notice to Station Supervisor
        sup = db.query(UserModel).filter(UserModel.role == "supervisor", UserModel.station_id == station_id).first()
        if sup:
            sup_notice = NoticeModel(
                id=f"NOTIF-SUP-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order_id,
                kind="critical_assignment",
                worker_id=sup.id,
                worker_name=sup.name,
                target_role="supervisor",
                station_id=station_id,
                title=f"URGENT WORK ORDER: {data.title}",
                message=f"Critical issue on {data.machine_id or 'station'}. Admin requires immediate worker dispatch."
            )
            db.add(sup_notice)

    elif data.assignee_id:
        worker_notice = NoticeModel(
            id=f"NOTIF-WKR-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order_id,
            kind="assigned",
            worker_id=data.assignee_id,
            worker_name=data.assignee_id,
            target_role="worker",
            station_id=station_id,
            title=f"New Task Assigned: {data.title}",
            message=data.detail
        )
        db.add(worker_notice)

    db.commit()
    return {"ok": True, "id": order_id}

@app.post("/api/workorders/{order_id}/admin-assign-supervisor")
def admin_assign_supervisor(
    order_id: str,
    data: AdminAssignSupervisorRequest,
    db: Session = Depends(get_db)
):
    """
    Step 3 in Workflow: Factory Admin approves and assigns work order to station supervisor.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    supervisor = db.query(UserModel).filter(UserModel.id == data.supervisor_id, UserModel.role == "supervisor").first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found.")

    order.supervisor_id = supervisor.id
    order.station_id = supervisor.station_id
    order.status = "assigned_to_supervisor"
    order.manager_note = data.manager_note or order.manager_note

    timeline = json.loads(order.timeline_json or "[]")
    now_iso = datetime.utcnow().isoformat()
    timeline.append({
        "at": now_iso,
        "by": "ADMIN",
        "byName": "Factory Admin",
        "kind": "assigned_supervisor",
        "message": f"Approved and assigned to Station {supervisor.station_id} Supervisor ({supervisor.name}). Note: {data.manager_note or 'Please dispatch qualified worker promptly.'}"
    })
    order.timeline_json = json.dumps(timeline)

    # Create notification for supervisor
    notice = NoticeModel(
        id=f"NOTIF-SUP-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
        work_order_id=order.id,
        kind="assigned_to_supervisor",
        worker_id=supervisor.id,
        worker_name=supervisor.name,
        target_role="supervisor",
        station_id=supervisor.station_id,
        title=f"Work Order Approved: {order.title}",
        message=f"Admin assigned this order to your station. Please assign a qualified maintenance worker."
    )
    db.add(notice)
    db.commit()
    return {"ok": True, "status": order.status, "supervisorId": supervisor.id}

@app.post("/api/workorders/{order_id}/supervisor-assign-worker")
def supervisor_assign_worker(
    order_id: str,
    data: SupervisorAssignWorkerRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Step 4 in Workflow: Station Supervisor assigns work order to qualified worker.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    worker = db.query(UserModel).filter(UserModel.id == data.worker_id, UserModel.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    # Check worker belongs to the same station
    if order.station_id and worker.station_id and order.station_id != worker.station_id:
        raise HTTPException(status_code=400, detail=f"Worker belongs to Station {worker.station_id}, but order is for Station {order.station_id}.")

    order.assignee_id = worker.id
    order.status = "assigned_to_worker"

    timeline = json.loads(order.timeline_json or "[]")
    now_iso = datetime.utcnow().isoformat()
    sup_name = auth.get("userId") or "Station Supervisor"
    timeline.append({
        "at": now_iso,
        "by": auth.get("userId") or "SUPERVISOR",
        "byName": "Station Supervisor",
        "kind": "assigned_worker",
        "message": f"Assigned to {worker.name} ({worker.specialization}). Instruction: {data.note or 'Proceed with standard SOP & safety checklist.'}"
    })
    order.timeline_json = json.dumps(timeline)

    # Notice to worker
    notice = NoticeModel(
        id=f"NOTIF-WKR-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
        work_order_id=order.id,
        kind="assigned_to_worker",
        worker_id=worker.id,
        worker_name=worker.name,
        target_role="worker",
        station_id=worker.station_id,
        title=f"Task Assigned: {order.title}",
        message=f"Supervisor assigned you to {order.machine_id or 'machine'}. Please review safety guidelines and accept."
    )
    db.add(notice)
    db.commit()
    return {"ok": True, "status": order.status, "assigneeId": worker.id}

@app.post("/api/workorders/{order_id}/unassign-worker")
def unassign_work_order(
    order_id: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Unassigns the worker from a work order.
    Returns the order to 'assigned_to_supervisor' (or 'pending_admin' if no supervisor),
    frees the worker, and logs on the audit timeline.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    if not order.assignee_id:
        return {"ok": True, "message": "Work order already has no assigned worker.", "status": order.status}

    prev_assignee = db.query(UserModel).filter(UserModel.id == order.assignee_id).first()
    prev_worker_name = prev_assignee.name if prev_assignee else order.assignee_id

    order.assignee_id = None
    if order.status in ("assigned_to_worker", "accepted", "in_progress", "blocked"):
        order.status = "assigned_to_supervisor" if order.supervisor_id else "pending_admin"

    now_iso = datetime.utcnow().isoformat()
    timeline = json.loads(order.timeline_json or "[]")
    actor_name = auth.get("name") or (f"Station {auth.get('station')} Supervisor" if auth.get("role") == "supervisor" else "Admin")
    timeline.append({
        "at": now_iso,
        "by": auth.get("userId") or "SUPERVISOR",
        "byName": actor_name,
        "kind": "unassigned_worker",
        "message": f"Worker unassigned: {prev_worker_name}. Order returned to station queue for reassignment or AI auto-dispatch."
    })
    order.timeline_json = json.dumps(timeline)

    # Notice to worker that they were unassigned
    if prev_assignee:
        db.add(NoticeModel(
            id=f"NOTIF-UNASG-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order.id,
            kind="task_unassigned",
            worker_id=prev_assignee.id,
            worker_name=prev_assignee.name,
            target_role="worker",
            station_id=order.station_id,
            title=f"Task Unassigned: {order.title}",
            message=f"You were unassigned from {order.id} ({order.machine_id or 'machine'}) by {actor_name}. You are now free for other assignments."
        ))

    db.commit()
    return {
        "ok": True,
        "orderId": order.id,
        "status": order.status,
        "message": f"Worker {prev_worker_name} unassigned successfully. Order returned to queue."
    }

@app.post("/api/workorders/{order_id}/worker-update")
def worker_update_task(
    order_id: str,
    data: WorkerUpdateRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Steps 6, 7, 8 in Workflow: Worker accepts/rejects, updates to in_progress/blocked, and marks resolved.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    timeline = json.loads(order.timeline_json or "[]")
    now_iso = datetime.utcnow().isoformat()
    action = data.action.lower()

    if action == "accept":
        order.status = "accepted"
        msg = "Worker accepted the work order."
    elif action == "reject":
        order.status = "assigned_to_supervisor" # goes back to supervisor for reassignment
        order.assignee_id = None
        msg = f"Worker rejected assignment: {data.note or 'Worker unavailable or reassignment needed.'}"
        # Notify supervisor
        if order.supervisor_id:
            db.add(NoticeModel(
                id=f"NOTIF-REJ-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="reassignment_needed",
                worker_id=order.supervisor_id,
                worker_name="Station Supervisor",
                target_role="supervisor",
                station_id=order.station_id,
                title=f"Worker Rejected Task: {order.title}",
                message=msg
            ))
    elif action == "start":
        order.status = "in_progress"
        msg = f"Worker started repair. {data.note or 'LOTO applied and diagnostics initiated.'}"
        # Notify supervisor
        if order.supervisor_id:
            db.add(NoticeModel(
                id=f"NOTIF-START-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="in_progress",
                worker_id=order.supervisor_id,
                worker_name="Station Supervisor",
                target_role="supervisor",
                station_id=order.station_id,
                title=f"Repair Started: {order.title}",
                message=f"Worker has commenced maintenance work. LOTO safety isolation applied on {order.machine_id or 'station equipment'}."
            ))
    elif action == "block":
        order.status = "blocked"
        order.blocked_reason = data.blocked_reason or data.note or "Work blocked awaiting parts or access."
        msg = f"Task blocked. Reason: {order.blocked_reason}"
        # Notify supervisor
        if order.supervisor_id:
            db.add(NoticeModel(
                id=f"NOTIF-BLK-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="task_blocked",
                worker_id=order.supervisor_id,
                worker_name="Station Supervisor",
                target_role="supervisor",
                station_id=order.station_id,
                title=f"Task Blocked: {order.title}",
                message=msg
            ))
    elif action == "resolve":
        machine = db.query(MachineModel).filter(MachineModel.id == order.machine_id).first() if order.machine_id else None
        if machine:
            order.repair_snapshot_json = json.dumps(repair_fault_readings(machine))
            record_machine_reading(db, machine)
        # Parts are recorded with the resolution transaction, so inventory and
        # work-order history cannot get out of sync on a partial request.
        consumed = json.loads(order.consumed_parts_json or "[]")
        for part in data.parts_used:
            part_id = str(part.get("item_id") or part.get("itemId") or "")
            quantity = int(part.get("quantity", 0))
            item = db.query(InventoryItemModel).filter(InventoryItemModel.id == part_id).first()
            if not item or quantity < 1:
                raise HTTPException(status_code=400, detail="Each used part must identify an existing inventory item and a positive quantity.")
            compatible = json.loads(item.compatible_machines or "[]")
            if order.station_id and item.station_id not in (order.station_id, "ALL"):
                raise HTTPException(status_code=400, detail=f"{item.name} is stocked for a different station.")
            if compatible and order.machine_id and order.machine_id not in compatible:
                raise HTTPException(status_code=400, detail=f"{item.name} is not compatible with machine {order.machine_id}.")
            if item.stock_level < quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.name}. Available: {item.stock_level}, requested: {quantity}.")
            item.stock_level -= quantity
            item.updated_at = datetime.utcnow()
            previous = next((entry for entry in consumed if entry.get("itemId") == item.id), None)
            if previous:
                previous["quantity"] += quantity
            else:
                consumed.append({"itemId": item.id, "name": item.name, "quantity": quantity})
            timeline_entry = {"at": now_iso, "by": auth.get("userId") or order.assignee_id or "Worker", "byName": "Factory Maintenance Worker", "kind": "part_consumed", "message": f"Consumed {quantity}x {item.name}; remaining stock {item.stock_level}."}
            timeline.append(timeline_entry)
            if item.stock_level <= item.min_threshold:
                db.add(NoticeModel(id=f"NOTIF-INV-LOW-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}", work_order_id=order.id, kind="inventory_low_stock", worker_id="system", worker_name="FactoryIQ Inventory Monitor", target_role="supervisor" if item.station_id != "ALL" else "admin", station_id=item.station_id if item.station_id != "ALL" else None, title=f"Low Stock Alert: {item.name}", message=f"Stock has dropped to {item.stock_level} units (Safety threshold: {item.min_threshold}). Reorder advised."))
        order.consumed_parts_json = json.dumps(consumed)
        order.status = "awaiting_verification"
        order.worker_notes = data.repair_notes or data.note or "Repair completed according to SOP."
        msg = f"Worker completed repair. Awaiting supervisor signoff. Notes: {order.worker_notes}"
        
        # Notify supervisor to verify
        if order.supervisor_id:
            db.add(NoticeModel(
                id=f"NOTIF-VRF-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="awaiting_verification",
                worker_id=order.supervisor_id,
                worker_name="Station Supervisor",
                target_role="supervisor",
                station_id=order.station_id,
                title=f"Repair Ready for Verification: {order.title}",
                message=f"Worker reported completion: {order.worker_notes}. Please perform physical verification and close."
            ))
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{data.action}'.")

    timeline.append({
        "at": now_iso,
        "by": auth.get("userId") or order.assignee_id or "Worker",
        "byName": "Factory Maintenance Worker",
        "kind": action,
        "message": msg
    })
    order.timeline_json = json.dumps(timeline)
    db.commit()
    return {"ok": True, "status": order.status}

@app.post("/api/workorders/{order_id}/supervisor-verify-close")
def supervisor_verify_and_close(
    order_id: str,
    data: SupervisorVerifyCloseRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Steps 9 & 10 in Workflow: Supervisor verifies completed work order and officially closes it.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    timeline = json.loads(order.timeline_json or "[]")
    now_iso = datetime.utcnow().isoformat()

    if data.verified:
        order.status = "closed"
        order.resolved_at = now_iso
        order.verification_notes = data.verification_notes
        msg = f"Supervisor verified repair and closed work order. Verification notes: {data.verification_notes}"

        if order.machine_id:
            m = db.query(MachineModel).filter(MachineModel.id == order.machine_id).first()
            if m:
                m.status = classify_machine(m, json.loads(m.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}'))
                m.recommended_action = "Repair verified by supervisor. Standard continuous monitoring resumed."

        # Notify Admin of successful resolution
        db.add(NoticeModel(
            id=f"NOTIF-RES-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order.id,
            kind="closed",
            worker_id="MGR01",
            worker_name="Factory Admin",
            target_role="admin",
            station_id=order.station_id,
            title=f"Work Order Closed: {order.title}",
            message=f"Supervisor confirmed repair on {order.machine_id or 'station'}. Machine restored to normal service."
        ))
    else:
        # A rejected verification restores the pre-repair readings and rolls
        # back their classification, while consumed parts remain consumed.
        order.status = "in_progress"
        if order.machine_id and order.repair_snapshot_json:
            m = db.query(MachineModel).filter(MachineModel.id == order.machine_id).first()
            if m:
                for field, value in json.loads(order.repair_snapshot_json).items():
                    setattr(m, field, value)
                thresholds = json.loads(m.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
                m.status = classify_machine(m, thresholds)
                m.failure_risk = {"normal": 8, "warning": 38, "critical": 68}[m.status]
                m.rupees_at_risk = estimate_rupees_at_risk(m, m.status, thresholds)
                m.updated_at = datetime.utcnow()
                record_machine_reading(db, m)
            order.repair_snapshot_json = None
        msg = f"Supervisor inspection failed: {data.verification_notes}. Returned to worker for rework."
        if order.assignee_id:
            db.add(NoticeModel(
                id=f"NOTIF-REWORK-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="rework_required",
                worker_id=order.assignee_id,
                worker_name=order.assignee_id,
                target_role="worker",
                station_id=order.station_id,
                title=f"Rework Required: {order.title}",
                message=f"Supervisor verification rejected: {data.verification_notes}."
            ))

    timeline.append({
        "at": now_iso,
        "by": auth.get("userId") or "SUPERVISOR",
        "byName": "Station Supervisor",
        "kind": "verified_closed" if data.verified else "verification_rejected",
        "message": msg
    })
    order.timeline_json = json.dumps(timeline)
    db.commit()
    return {"ok": True, "status": order.status}

# Maintain legacy /status endpoint for backward compatibility
@app.post("/api/workorders/{order_id}/status")
def update_order_status(order_id: str, update: StatusUpdate, db: Session = Depends(get_db)):
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")

    timeline = json.loads(order.timeline_json or "[]")
    now_iso = datetime.utcnow().isoformat()
    timeline.append({
        "at": now_iso,
        "by": update.by,
        "byName": update.byName,
        "kind": update.status,
        "message": update.note or f"Status changed to {update.status}"
    })

    order.status = update.status
    order.timeline_json = json.dumps(timeline)
    if update.status in ("resolved", "closed"):
        order.resolved_at = now_iso

    db.commit()
    return {"ok": True, "status": order.status}

# ---------- Intelligent Auto-Assign & Inventory Engine ----------

def find_best_worker_for_task(db: Session, station_id: str, title: str, detail: str = ""):
    """
    Intelligent Worker Matcher:
    1. Filter candidates by machine station
    2. Check availability
    3. Score specialization match based on anomaly keywords
    4. Balance workload (prefer worker with fewer active orders)
    """
    workers = db.query(UserModel).filter(
        UserModel.role == "worker",
        UserModel.station_id == station_id
    ).all()
    if not workers:
        return None, f"No registered workers found for station {station_id}."
    workers = [worker for worker in workers if worker.available]
    if not workers:
        return None, f"No available workers found for station {station_id}."

    text = f"{title} {detail}".lower()

    # Determine optimal specialization
    spec_target = "General Maintenance"
    if any(k in text for k in ("bearing", "vibration", "temp", "spindle", "alignment", "mechanical", "gearbox", "shaft")):
        spec_target = "Mechanical Maintenance"
    elif any(k in text for k in ("voltage", "current", "motor", "trip", "electrical", "breaker", "surge", "short", "inverter")):
        spec_target = "Electrical Maintenance"
    elif any(k in text for k in ("sensor", "encoder", "optical", "calibration", "plc", "drift", "proximity", "vision", "camera")):
        spec_target = "Instrumentation & Controls"
    elif any(k in text for k in ("robot", "arm", "axis", "weld nozzle", "harmonic", "gripper", "laser", "teach", "palletizer")):
        spec_target = "Robotics & Automation"
    elif any(k in text for k in ("hydraulic", "ram", "oil", "leak", "pressure", "valve", "seal", "fluid")):
        spec_target = "Mechanical Maintenance" if station_id in ("A", "B") else "General Maintenance"

    scored = []
    for w in workers:
        score = 0
        # Factor 1: Availability (+100 for Available, -50 for Unavailable)
        score += 100

        # Factor 2: Specialization Match (+60 for exact, +25 for related)
        if w.specialization and w.specialization.lower() == spec_target.lower():
            score += 60
        elif w.specialization and ("general" in w.specialization.lower() or "mechanical" in w.specialization.lower()):
            score += 25

        # Factor 3: Workload balancing (-15 per currently active task)
        active_count = db.query(WorkOrderModel).filter(
            WorkOrderModel.assignee_id == w.id,
            WorkOrderModel.status.in_(("assigned_to_worker", "accepted", "in_progress"))
        ).count()
        score -= (active_count * 15)

        scored.append((score, w, active_count, spec_target))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_worker, active_tasks, matched_spec = scored[0]

    reason = f"Selected {best_worker.name} ({best_worker.specialization}) — " \
             f"{'Available' if best_worker.available else 'Unavailable (Forced assignment)'}, " \
             f"{active_tasks} active task(s)"
    return best_worker, reason

def find_best_spare_part(db: Session, machine_id: str, station_id: str, title: str):
    """
    Smart Inventory Matcher:
    Looks up parts compatible with machine and matches fault signature.
    Prioritizes specific station parts over universal consumables.
    """
    text = title.lower()
    items = db.query(InventoryItemModel).filter(
        or_(
            InventoryItemModel.station_id == station_id,
            InventoryItemModel.station_id == "ALL"
        )
    ).all()

    if not items:
        return None

    scored = []
    for item in items:
        comps = json.loads(item.compatible_machines or "[]")
        if comps and machine_id and machine_id not in comps:
            continue
        score = 0

        # Exact machine compatibility
        if machine_id and machine_id in comps:
            score += 50

        # Station-specific parts prioritized over universal ALL
        if item.station_id == station_id:
            score += 30
        if (item.stock_level or 0) > 0:
            score += 100

        cat = (item.category or "").lower()
        name = (item.name or "").lower()

        # Keyword matching in name or category
        words = [w for w in text.replace(",", " ").replace("-", " ").split() if len(w) > 2]
        for w in words:
            if w in name:
                score += 25
            if w in cat:
                score += 15

        # Domain specific keywords
        if any(k in text for k in ("bearing", "spindle")) and "bearing" in cat:
            score += 40
        if any(k in text for k in ("dampen", "vibration", "isolat", "pad")) and ("dampen" in name or "isolat" in name or "dmp" in item.id.lower()):
            score += 60
        if any(k in text for k in ("seal", "leak", "hydraulic", "pressure")) and "seal" in cat:
            score += 40
        if any(k in text for k in ("laser", "nozzle", "plasma", "electrode")) and ("nozzle" in name or "electrode" in name):
            score += 40
        if any(k in text for k in ("sensor", "encoder", "drift", "optical")) and "sensors" in cat:
            score += 40

        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1] if scored else None

@app.post("/api/workorders/{order_id}/auto-dispatch")
def auto_dispatch_work_order(
    order_id: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    One-Click AI Dispatch for any pending work order:
    Auto-detects machine, finds best available worker, allocates spare parts,
    and updates timeline & notifications.
    """
    order = db.query(WorkOrderModel).filter(WorkOrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")

    station_id = order.station_id
    if not station_id and order.machine_id:
        m = db.query(MachineModel).filter(MachineModel.id == order.machine_id).first()
        if m:
            station_id = m.station
    station_id = station_id or "A"

    best_worker, match_reason = find_best_worker_for_task(db, station_id, order.title, order.detail)
    if not best_worker:
        raise HTTPException(status_code=400, detail="No suitable worker found for auto-dispatch.")

    # Match spare part
    part = find_best_spare_part(db, order.machine_id or "", station_id, order.title)
    if part and not order.spare_parts:
        order.spare_parts = f"{part.name} (Part #{part.id}) [Loc: {part.location_bin}]"

    # ── Inventory-Aware Priority Guard ──
    # If the required spare part is completely OUT OF STOCK, DO NOT tie up the technician!
    # Instead, place the task on HOLD (Blocked awaiting parts) and free the worker for actionable repairs.
    if part and (part.stock_level or 0) <= 0:
        order.status = "blocked"
        order.assignee_id = None
        order.blocked_reason = f"Awaiting Spare Parts: {part.name} (#{part.id}) is OUT OF STOCK. Lead time: {part.lead_time_days} days. Worker freed for other actionable tasks."

        now_iso = datetime.utcnow().isoformat()
        timeline = json.loads(order.timeline_json or "[]")
        timeline.append({
            "at": now_iso,
            "by": "AI-Auto-Dispatcher",
            "byName": "FactoryIQ Inventory-Aware Dispatcher",
            "kind": "parts_stockout_blocked",
            "message": f"STOCKOUT ALERT: {part.name} is currently out of stock (0 units). Work order held in BLOCKED state so technician can work on actionable repairs. Reorder alert dispatched to stores."
        })
        order.timeline_json = json.dumps(timeline)

        # Notify Admin & Supervisor of urgent replenishment need
        db.add(NoticeModel(
            id=f"NOTIF-PARTS-STOCKOUT-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order.id,
            kind="parts_shortage_escalation",
            worker_id="admin",
            worker_name="Central Stores",
            target_role="admin",
            station_id=station_id,
            title=f"Parts Shortage: {order.machine_id or 'Machine'} Blocked",
            message=f"Work order {order.id} ({order.title}) requires {part.name} which has 0 units in stock. Urgent replenishment required from {part.supplier}."
        ))

        sup = db.query(UserModel).filter(UserModel.role == "supervisor", UserModel.station_id == station_id).first()
        if sup:
            order.supervisor_id = sup.id
            db.add(NoticeModel(
                id=f"NOTIF-SUP-STKOUT-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=order.id,
                kind="parts_shortage_escalation",
                worker_id=sup.id,
                worker_name=sup.name,
                target_role="supervisor",
                station_id=station_id,
                title=f"Stockout: {order.id} Placed on Hold",
                message=f"Task {order.id} held awaiting {part.name}. Technician remains free for other actionable jobs."
            ))

        db.commit()
        return {
            "ok": True,
            "orderId": order.id,
            "status": "blocked",
            "blockedReason": order.blocked_reason,
            "partsAvailable": False,
            "missingPart": {
                "id": part.id,
                "name": part.name,
                "stockLevel": part.stock_level,
                "leadTime": part.lead_time_days
            },
            "message": f"Task set to BLOCKED due to {part.name} stockout. Technician freed for actionable tasks."
        }

    # Parts are in stock! Proceed with dispatch
    order.assignee_id = best_worker.id
    order.status = "assigned_to_worker"
    order.specialization_required = best_worker.specialization

    sup = db.query(UserModel).filter(UserModel.role == "supervisor", UserModel.station_id == station_id).first()
    if sup:
        order.supervisor_id = sup.id

    now_iso = datetime.utcnow().isoformat()
    timeline = json.loads(order.timeline_json or "[]")
    timeline.append({
        "at": now_iso,
        "by": auth.get("userId") or "AI-Dispatcher",
        "byName": "FactoryIQ AI Auto-Dispatcher",
        "kind": "auto_assigned",
        "message": f"Auto-dispatched to {best_worker.name} ({best_worker.specialization}). Reason: {match_reason}. Allocated spare: {part.name if part else 'Standard maintenance kit'}."
    })
    order.timeline_json = json.dumps(timeline)

    # Dispatch Notice to Worker
    db.add(NoticeModel(
        id=f"NOTIF-WO-ASSIGN-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
        work_order_id=order.id,
        kind="task_auto_assigned",
        worker_id=best_worker.id,
        worker_name=best_worker.name,
        target_role="worker",
        station_id=station_id,
        title=f"New Task Auto-Assigned: {order.title}",
        message=f"FactoryIQ Auto-Dispatch assigned you to {order.machine_id or 'machine'}. Spare part: {part.name if part else 'Standard kit'}. Review safety SOP and accept."
    ))

    # Audit Notice to Supervisor
    if sup:
        db.add(NoticeModel(
            id=f"NOTIF-SUP-DISP-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order.id,
            kind="dispatch_audit",
            worker_id=sup.id,
            worker_name=sup.name,
            target_role="supervisor",
            station_id=station_id,
            title=f"AI Dispatch: {order.id} -> {best_worker.name}",
            message=f"{order.title} was auto-dispatched to {best_worker.name} ({best_worker.specialization}). Part: {part.name if part else 'Standard kit'}."
        ))

    db.commit()
    return {
        "ok": True,
        "orderId": order.id,
        "status": order.status,
        "assigneeId": best_worker.id,
        "assigneeName": best_worker.name,
        "specialization": best_worker.specialization,
        "matchReason": match_reason,
        "allocatedPart": {
            "id": part.id,
            "name": part.name,
            "location": part.location_bin,
            "stockLevel": part.stock_level
        } if part else None
    }

@app.post("/api/workorders/auto-assign")
def create_and_auto_assign_work_order(
    req: AutoAssignRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Creates an emergency/predictive work order AND auto-dispatches it in one shot.
    """
    machine = db.query(MachineModel).filter(MachineModel.id == req.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    station_id = getattr(machine, "station", None) or getattr(machine, "station_id", None) or "A"
    title = req.title or f"Predictive Alert: {machine.name} {req.severity.upper()} Fault"
    detail = req.detail or f"AI Anomaly Engine detected abnormal telemetry on {machine.name}. Vibration: {machine.vibration} mm/s, Temp: {machine.temperature} C."

    order_id = f"WO-{machine.id}-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(3)}"
    issue_key = f"{machine.id}-{datetime.utcnow().strftime('%Y%m%d%H%M')}"

    best_worker, match_reason = find_best_worker_for_task(db, station_id, title, detail)
    part = find_best_spare_part(db, machine.id, station_id, title)
    sup = db.query(UserModel).filter(UserModel.role == "supervisor", UserModel.station_id == station_id).first()

    now_iso = datetime.utcnow().isoformat()
    timeline = [
        {
            "at": now_iso,
            "by": "AI-Diagnostic-Engine",
            "byName": "FactoryIQ Anomaly Engine",
            "kind": "created",
            "message": f"Generated predictive maintenance order for {machine.name}."
        },
        {
            "at": now_iso,
            "by": "AI-Auto-Dispatcher",
            "byName": "FactoryIQ Auto-Dispatch",
            "kind": "auto_assigned",
            "message": f"Auto-assigned to {best_worker.name if best_worker else 'Station'}. Reason: {match_reason}. Allocated: {part.name if part else 'General Kit'}."
        }
    ]

    spare_str = f"{part.name} (Part #{part.id}) [Loc: {part.location_bin}]" if part else "Standard Maintenance Kit"
    safety_str = f"Mandatory LOTO on {machine.name} 415V supply. Wear heat-resistant PPE and safety glasses."

    # Inventory-Aware check: if required spare part is out of stock, do not tie up worker
    is_part_stockout = bool(part and (part.stock_level or 0) <= 0)
    order_status = "blocked" if is_part_stockout else ("assigned_to_worker" if best_worker else "assigned_to_supervisor")
    order_assignee = None if is_part_stockout else (best_worker.id if best_worker else None)
    blocked_reason_str = f"Awaiting Spare Parts: {part.name} (#{part.id}) is OUT OF STOCK. Lead time: {part.lead_time_days} days. Worker freed for other actionable tasks." if is_part_stockout else ""

    if is_part_stockout:
        timeline.append({
            "at": now_iso,
            "by": "AI-Inventory-Monitor",
            "byName": "FactoryIQ Inventory Guard",
            "kind": "parts_stockout_blocked",
            "message": f"STOCKOUT ALERT: {part.name} has 0 units in stock. Work order placed on HOLD to keep technician available for actionable repairs."
        })

    new_order = WorkOrderModel(
        id=order_id,
        issue_key=issue_key,
        source="ai_auto_dispatch",
        machine_id=machine.id,
        station_id=station_id,
        title=title,
        detail=detail,
        action=f"Inspect and replace worn components on {machine.name}. Follow standard LOTO SOP.",
        severity=req.severity,
        priority=req.priority,
        assignee_id=order_assignee,
        assigned_by_id=auth.get("userId") or "AI-Dispatcher",
        supervisor_id=sup.id if sup else None,
        manager_note="Auto-generated & dispatched by FactoryIQ Predictive Maintenance Engine." if not is_part_stockout else "Stockout: Awaiting replenishment.",
        specialization_required=best_worker.specialization if best_worker else "Mechanical Maintenance",
        spare_parts=spare_str,
        safety_instructions=safety_str,
        blocked_reason=blocked_reason_str,
        status=order_status,
        created_at=now_iso,
        impact_inr=machine.rupees_at_risk or 5000.0,
        timeline_json=json.dumps(timeline)
    )

    db.add(new_order)

    if best_worker and not is_part_stockout:
        db.add(NoticeModel(
            id=f"NOTIF-WO-NEW-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order_id,
            kind="task_auto_assigned",
            worker_id=best_worker.id,
            worker_name=best_worker.name,
            target_role="worker",
            station_id=station_id,
            title=f"Emergency Task Auto-Assigned: {machine.name}",
            message=f"Critical threshold breach on {machine.name}. Proceed with LOTO and install {part.name if part else 'spares'}."
        ))

    if is_part_stockout:
        db.add(NoticeModel(
            id=f"NOTIF-STOCKOUT-REQ-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order_id,
            kind="parts_shortage_escalation",
            worker_id="admin",
            worker_name="Central Stores",
            target_role="admin",
            station_id=station_id,
            title=f"Parts Stockout Blocking Task: {machine.name}",
            message=f"Work order {order_id} requires {part.name} which has 0 units in stock. Urgent replenishment required from {part.supplier}."
        ))

    if sup:
        db.add(NoticeModel(
            id=f"NOTIF-SUP-DISP-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=order_id,
            kind="dispatch_audit",
            worker_id=sup.id,
            worker_name=sup.name,
            target_role="supervisor",
            station_id=station_id,
            title=f"Auto-Dispatch Alert: {machine.name}",
            message=f"Work order {order_id} generated and auto-assigned to {best_worker.name if best_worker else 'unassigned'}."
        ))

    db.commit()
    return {
        "ok": True,
        "order": {
            "id": new_order.id,
            "machineId": new_order.machine_id,
            "stationId": new_order.station_id,
            "title": new_order.title,
            "status": new_order.status,
            "assigneeId": new_order.assignee_id,
            "assigneeName": best_worker.name if best_worker else None,
            "spareParts": new_order.spare_parts,
            "matchReason": match_reason
        }
    }

@app.post("/api/workorders/dispatch-station-queue")
def dispatch_station_work_order_queue(
    station_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    """
    Priority & Inventory-Aware Queue Dispatcher:
    Evaluates pending work orders in priority order (Critical > Warning, High > Medium > Low).
    - If required spare parts are IN STOCK: Dispatches to the best qualified available worker!
    - If required spare parts are OUT OF STOCK: Marks the order BLOCKED (Awaiting Parts),
      triggers a procurement shortage alert, and IMMEDIATELY proceeds to the next actionable order
      so technicians are not kept idle waiting for unstocked components!
    """
    st = station_id or auth.get("station")
    query = db.query(WorkOrderModel).filter(
        WorkOrderModel.status.in_(("pending_admin", "assigned_to_supervisor"))
    )
    if st and st != "ALL":
        query = query.filter(WorkOrderModel.station_id == st)

    orders = query.all()

    priority_map = {"Critical": 3, "High": 2, "Medium": 1, "Low": 0}
    orders.sort(
        key=lambda o: (1 if o.severity == "critical" else 0, priority_map.get(o.priority, 1)),
        reverse=True
    )

    dispatched = []
    blocked_stockout = []

    for order in orders:
        order_st = order.station_id or "A"
        part = find_best_spare_part(db, order.machine_id or "", order_st, order.title)

        # ── Stockout Check ──
        if part and (part.stock_level or 0) <= 0:
            order.status = "blocked"
            order.assignee_id = None
            order.blocked_reason = f"Awaiting Spare Parts: {part.name} (#{part.id}) is OUT OF STOCK. Lead time {part.lead_time_days}d. Worker freed for next actionable job."
            
            tl = json.loads(order.timeline_json or "[]")
            tl.append({
                "at": datetime.utcnow().isoformat(),
                "by": "AI-Queue-Dispatcher",
                "byName": "FactoryIQ Inventory-Aware Queue Dispatcher",
                "kind": "parts_stockout_blocked",
                "message": f"STOCKOUT: {part.name} has 0 units in stock. Placed on HOLD so technician can be assigned to actionable tasks."
            })
            order.timeline_json = json.dumps(tl)

            blocked_stockout.append({
                "orderId": order.id,
                "title": order.title,
                "missingPart": part.name,
                "reason": "Placed on hold due to stockout; technician reassigned to actionable task."
            })
            continue

        # Parts are in stock! Find best available worker
        best_worker, match_reason = find_best_worker_for_task(db, order_st, order.title, order.detail)
        if best_worker and best_worker.available:
            order.assignee_id = best_worker.id
            order.status = "assigned_to_worker"
            order.specialization_required = best_worker.specialization
            if part and not order.spare_parts:
                order.spare_parts = f"{part.name} (Part #{part.id}) [Loc: {part.location_bin}]"

            tl = json.loads(order.timeline_json or "[]")
            tl.append({
                "at": datetime.utcnow().isoformat(),
                "by": "AI-Queue-Dispatcher",
                "byName": "FactoryIQ Queue Dispatcher",
                "kind": "auto_assigned",
                "message": f"Assigned to {best_worker.name} ({best_worker.specialization}). Parts in stock: {part.name if part else 'Standard kit'}."
            })
            order.timeline_json = json.dumps(tl)

            dispatched.append({
                "orderId": order.id,
                "title": order.title,
                "assignedWorker": best_worker.name,
                "part": part.name if part else "Standard PM Kit",
                "reason": match_reason
            })

    db.commit()
    return {
        "ok": True,
        "dispatchedCount": len(dispatched),
        "dispatched": dispatched,
        "blockedStockoutCount": len(blocked_stockout),
        "blockedStockout": blocked_stockout
    }

# ---------- Inventory Endpoints ----------

@app.get("/api/inventory")
def list_inventory(
    station: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    query = db.query(InventoryItemModel)

    # Scoping: if user is supervisor, scope to their station + ALL
    if auth["role"] == "supervisor" and auth["station"]:
        query = query.filter(InventoryItemModel.station_id.in_((auth["station"], "ALL")))
    elif station and station != "ALL":
        query = query.filter(or_(InventoryItemModel.station_id == station, InventoryItemModel.station_id == "ALL"))

    if category and category != "ALL":
        query = query.filter(InventoryItemModel.category == category)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(InventoryItemModel.name.ilike(s), InventoryItemModel.id.ilike(s), InventoryItemModel.location_bin.ilike(s)))

    items = query.order_by(InventoryItemModel.station_id.asc(), InventoryItemModel.name.asc()).all()

    total_skus = len(items)
    total_valuation = sum((i.stock_level or 0) * (i.unit_cost_inr or 0) for i in items)
    low_stock = sum(1 for i in items if 0 < (i.stock_level or 0) <= (i.min_threshold or 0))
    out_of_stock = sum(1 for i in items if (i.stock_level or 0) <= 0)
    healthy_stock = sum(1 for i in items if (i.stock_level or 0) > (i.min_threshold or 0))

    formatted = []
    for item in items:
        st = "in_stock"
        if (item.stock_level or 0) <= 0:
            st = "out_of_stock"
        elif (item.stock_level or 0) <= (item.min_threshold or 0):
            st = "low_stock"

        if status and status != "ALL" and st != status:
            continue

        formatted.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "stationId": item.station_id,
            "compatibleMachines": json.loads(item.compatible_machines or "[]"),
            "stockLevel": item.stock_level,
            "minThreshold": item.min_threshold,
            "unitCostInr": item.unit_cost_inr,
            "locationBin": item.location_bin,
            "leadTimeDays": item.lead_time_days,
            "supplier": item.supplier,
            "status": st,
            "totalValuation": (item.stock_level or 0) * (item.unit_cost_inr or 0),
            "updatedAt": item.updated_at.isoformat() if item.updated_at else None
        })

    return {
        "summary": {
            "totalSKUs": total_skus,
            "totalValuationInr": round(total_valuation, 2),
            "lowStockCount": low_stock,
            "outOfStockCount": out_of_stock,
            "healthyStockCount": healthy_stock
        },
        "items": formatted
    }

@app.post("/api/inventory")
def create_inventory_item(
    req: InventoryItemCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    # Generate unique ID
    prefix = req.station_id if req.station_id in ("A", "B", "C", "D") else "ALL"
    cat_code = req.category[:3].upper()
    item_id = f"PART-{prefix}-{cat_code}-{secrets.token_hex(2).upper()}"

    item = InventoryItemModel(
        id=item_id,
        name=req.name,
        category=req.category,
        station_id=req.station_id,
        compatible_machines=json.dumps(req.compatible_machines or []),
        stock_level=req.stock_level,
        min_threshold=req.min_threshold,
        unit_cost_inr=req.unit_cost_inr,
        location_bin=req.location_bin,
        lead_time_days=req.lead_time_days,
        supplier=req.supplier or "FactoryIQ Industrial Supplies",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(item)
    db.commit()
    return {"ok": True, "item": {"id": item.id, "name": item.name, "stockLevel": item.stock_level}}

@app.put("/api/inventory/{item_id}/restock")
def restock_inventory_item(
    item_id: str,
    req: InventoryRestockRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    item = db.query(InventoryItemModel).filter(InventoryItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    old_stock = item.stock_level
    item.stock_level += req.quantity
    item.updated_at = datetime.utcnow()

    # ── Auto-Resume Blocked Work Orders ──
    # Check for any work orders that were held in BLOCKED state waiting for this specific spare part!
    blocked_orders = db.query(WorkOrderModel).filter(
        WorkOrderModel.status == "blocked",
        or_(
            WorkOrderModel.blocked_reason.ilike(f"%{item.id}%"),
            WorkOrderModel.spare_parts.ilike(f"%{item.id}%")
        )
    ).all()

    unblocked_count = 0
    for bo in blocked_orders:
        if item.stock_level <= 0:
            break

        bo_station = bo.station_id or "A"
        cand_worker, cand_reason = find_best_worker_for_task(db, bo_station, bo.title, bo.detail)
        if cand_worker:
            bo.assignee_id = cand_worker.id
            bo.status = "assigned_to_worker"
            bo.blocked_reason = ""
            bo.specialization_required = cand_worker.specialization
            unblocked_count += 1

            now_iso = datetime.utcnow().isoformat()
            tl = json.loads(bo.timeline_json or "[]")
            tl.append({
                "at": now_iso,
                "by": "Inventory-Auto-Resume",
                "byName": "FactoryIQ Inventory Auto-Resume",
                "kind": "auto_unblocked",
                "message": f"REQUIRED PART ARRIVED: Received +{req.quantity} units of {item.name}. Work order automatically unblocked and dispatched to {cand_worker.name} ({cand_worker.specialization}) with priority!"
            })
            bo.timeline_json = json.dumps(tl)

            # Notify worker
            db.add(NoticeModel(
                id=f"NOTIF-RESUME-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
                work_order_id=bo.id,
                kind="task_resumed",
                worker_id=cand_worker.id,
                worker_name=cand_worker.name,
                target_role="worker",
                station_id=bo_station,
                title=f"Parts In Stock: Task Unblocked ({bo.title})",
                message=f"Required component {item.name} has arrived at {item.location_bin}. Please collect and execute repair."
            ))

    db.add(NoticeModel(
        id=f"NOTIF-INV-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
        work_order_id=item.id,
        kind="inventory_restocked",
        worker_id=auth.get("userId") or "admin",
        worker_name=auth.get("name") or "Inventory Manager",
        target_role="supervisor" if item.station_id != "ALL" else "admin",
        station_id=item.station_id if item.station_id != "ALL" else None,
        title=f"Restocked: {item.name}",
        message=f"Received +{req.quantity} units into {item.location_bin}. New stock: {item.stock_level}. {unblocked_count} blocked order(s) automatically resumed. {req.note or ''}"
    ))
    db.commit()
    return {"ok": True, "itemId": item.id, "newStockLevel": item.stock_level, "oldStockLevel": old_stock, "unblockedOrdersCount": unblocked_count}

@app.post("/api/inventory/{item_id}/consume")
def consume_inventory_item(
    item_id: str,
    req: InventoryConsumeRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    item = db.query(InventoryItemModel).filter(InventoryItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    wo = None
    if req.work_order_id:
        wo = db.query(WorkOrderModel).filter(WorkOrderModel.id == req.work_order_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        compatible = json.loads(item.compatible_machines or "[]")
        if wo.station_id and item.station_id not in (wo.station_id, "ALL"):
            raise HTTPException(status_code=400, detail="Inventory item belongs to a different station")
        if compatible and wo.machine_id and wo.machine_id not in compatible:
            raise HTTPException(status_code=400, detail="Inventory item is not compatible with this machine")

    if item.stock_level < req.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {item.stock_level}, requested: {req.quantity}")

    item.stock_level -= req.quantity
    item.updated_at = datetime.utcnow()

    if wo:
        wo.consumed_part_id = item.id
        wo.consumed_part_qty = (wo.consumed_part_qty or 0) + req.quantity
        consumed = json.loads(wo.consumed_parts_json or "[]")
        previous = next((entry for entry in consumed if entry.get("itemId") == item.id), None)
        if previous:
            previous["quantity"] += req.quantity
        else:
            consumed.append({"itemId": item.id, "name": item.name, "quantity": req.quantity})
        wo.consumed_parts_json = json.dumps(consumed)
        timeline = json.loads(wo.timeline_json or "[]")
        timeline.append({
            "at": datetime.utcnow().isoformat(),
            "by": auth.get("userId") or "Worker",
            "byName": auth.get("name") or "Maintenance Worker",
            "kind": "part_consumed",
            "message": f"Consumed {req.quantity}x {item.name} from {item.location_bin}."
        })
        wo.timeline_json = json.dumps(timeline)

    if item.stock_level <= item.min_threshold:
        db.add(NoticeModel(
            id=f"NOTIF-INV-LOW-{int(datetime.utcnow().timestamp())}-{secrets.token_hex(2)}",
            work_order_id=item.id,
            kind="inventory_low_stock",
            worker_id="system",
            worker_name="FactoryIQ Inventory Monitor",
            target_role="supervisor" if item.station_id != "ALL" else "admin",
            station_id=item.station_id if item.station_id != "ALL" else None,
            title=f"Low Stock Alert: {item.name}",
            message=f"Stock has dropped to {item.stock_level} units (Safety threshold: {item.min_threshold}). Reorder advised."
        ))

    db.commit()
    return {"ok": True, "itemId": item.id, "newStockLevel": item.stock_level}

@app.delete("/api/inventory/{item_id}")
def delete_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    if auth["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only Factory Admin can delete inventory items.")
    item = db.query(InventoryItemModel).filter(InventoryItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True, "deletedId": item_id}

# ---------- Notices / Notifications (Role-linked) ----------

@app.get("/api/notices")
def list_notices(
    db: Session = Depends(get_db),
    auth: dict = Depends(get_auth_context)
):
    query = db.query(NoticeModel)

    if auth["role"] == "admin":
        # Admin gets admin notices and critical escalations
        query = query.filter(or_(NoticeModel.target_role == "admin", NoticeModel.kind.ilike("%escalation%")))
    elif auth["role"] == "supervisor":
        # Supervisor gets notices for their station
        if auth["station"]:
            query = query.filter(
                or_(
                    NoticeModel.worker_id == auth.get("userId"),
                    and_(NoticeModel.target_role == "supervisor", NoticeModel.station_id == auth["station"])
                )
            )
        else:
            query = query.filter(NoticeModel.target_role == "supervisor")
    elif auth["role"] == "worker" and auth["userId"]:
        query = query.filter(NoticeModel.worker_id == auth["userId"])

    notices = query.order_by(NoticeModel.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "workOrderId": n.work_order_id,
            "kind": n.kind,
            "workerId": n.worker_id,
            "workerName": n.worker_name,
            "title": n.title,
            "message": n.message,
            "createdAt": n.created_at,
            "read": bool(n.read)
        }
        for n in notices
    ]

@app.patch("/api/notices/{notice_id}/read")
def mark_notice_read(notice_id: str, db: Session = Depends(get_db)):
    notice = db.query(NoticeModel).filter(NoticeModel.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    notice.read = True
    db.commit()
    return {"ok": True}

# ---------- Startup Hook ----------

@app.on_event("startup")
def on_startup():
    print("FastAPI startup: Verifying all 50 machines in PostgreSQL...")
    seed_50_machines()
    reconcile_legacy_simulator_data()
    print("Starting continuous live telemetry stream (updating PostgreSQL every 5s)...")
    start_background_stream(interval_seconds=5)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)
