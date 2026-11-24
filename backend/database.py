import os
import json
import hashlib
import secrets
from datetime import datetime
from pathlib import Path
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import make_url

# ── Load .env from repo root (dev convenience; production uses real env vars) ──
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# ── Database URL ──────────────────────────────────────────────────────────────
_repo_root = Path(__file__).resolve().parent.parent
SQLITE_FALLBACK = f"sqlite:///{(_repo_root / 'factoryiq.db').as_posix()}"
DATABASE_URL = os.getenv("DATABASE_URL", SQLITE_FALLBACK)

def get_engine():
    url = DATABASE_URL or SQLITE_FALLBACK
    # Render and other hosts may provide the legacy `postgres://` scheme.
    # Normalize it so a PostgreSQL URL can never be mistaken for SQLite fallback.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url.removeprefix("postgres://")
    if "postgresql" in url:
        try:
            eng = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=20,
                max_overflow=30,
                pool_recycle=1800,
                pool_timeout=3,       # Quick 3s check so portable zips start instantly
            )
            with eng.connect():
                pass
            print(f"[DB] Connected to PostgreSQL.")
            return eng
        except Exception as exc:
            print(f"[DB] PostgreSQL connection error ({exc}). Falling back to bundled standalone factoryiq.db.")
            return create_engine(SQLITE_FALLBACK, connect_args={"check_same_thread": False})

    if url.startswith("sqlite:"):
        parsed_url = make_url(url)
        database_path = parsed_url.database
        if database_path and database_path != ":memory:":
            path = Path(database_path)
            if not path.is_absolute():
                # SQLite's ./ relative path depends on the launcher's current
                # directory. Anchor it to the repository so every launcher
                # opens the same populated factoryiq.db.
                parsed_url = parsed_url.set(database=str((_repo_root / path).resolve()))
        return create_engine(parsed_url, connect_args={"check_same_thread": False})
    
    eng = create_engine(SQLITE_FALLBACK, connect_args={"check_same_thread": False})
    print("[DB] Using portable standalone SQLite: factoryiq.db")
    return eng

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def make_password_hash(password: str, salt: str = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(plain: str, stored_hash: str) -> bool:
    if not stored_hash or not plain:
        return False
    p = plain.strip()
    if ":" in stored_hash:
        salt, val = stored_hash.split(":", 1)
        return (
            hashlib.sha256((salt + plain).encode()).hexdigest() == val
            or hashlib.sha256((salt + p).encode()).hexdigest() == val
        )
    return plain == stored_hash or p == stored_hash

class StationModel(Base):
    __tablename__ = "stations"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(200), nullable=True)
    role = Column(String(20), nullable=False) # 'admin', 'supervisor', 'worker'
    station_id = Column(String(50), nullable=True)
    supervisor_id = Column(String(50), nullable=True)
    specialization = Column(String(100), nullable=True)
    available = Column(Boolean, default=True)
    password_hash = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class MachineModel(Base):
    __tablename__ = "machines"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    station = Column(String(50), nullable=False)
    status = Column(String(20), default="normal")
    temperature = Column(Float, default=50.0)
    temp_bearing = Column(Float, default=48.0)
    temp_motor = Column(Float, default=52.0)
    vibration = Column(Float, default=1.0)
    power = Column(Float, default=15.0)
    load_pct = Column(Float, default=70.0)
    shaft_rpm = Column(Float, default=1500.0)
    health_score = Column(Float, default=90.0)
    downtime_hours = Column(Float, default=0.0)
    downtime_events = Column(Integer, default=0)
    failure_risk = Column(Integer, default=10)
    anomaly_score = Column(Float, default=0.1)
    rupees_at_risk = Column(Float, default=0.0)
    recommended_action = Column(Text, default="Continue routine monitoring.")
    priority = Column(String(20), default="Low")
    thresholds_json = Column(Text, default='{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
    baseline_json = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TelemetryHistoryModel(Base):
    __tablename__ = "telemetry_history"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    station = Column(String(50), nullable=False)
    temperature = Column(Float, default=50.0)
    temp_bearing = Column(Float, default=48.0)
    temp_motor = Column(Float, default=52.0)
    vibration = Column(Float, default=1.0)
    power = Column(Float, default=15.0)
    load_pct = Column(Float, default=70.0)
    shaft_rpm = Column(Float, default=1500.0)
    failure_risk = Column(Integer, default=10)
    rupees_at_risk = Column(Float, default=0.0)
    status = Column(String(20), default="normal")

class WorkOrderModel(Base):
    __tablename__ = "work_orders"

    id = Column(String(50), primary_key=True, index=True)
    issue_key = Column(String(100), nullable=False, index=True)
    source = Column(String(50), default="machine")
    machine_id = Column(String(50), nullable=True)
    station_id = Column(String(50), nullable=True)
    title = Column(String(200), nullable=False)
    detail = Column(Text, nullable=False)
    action = Column(Text, nullable=False)
    severity = Column(String(20), default="warning")
    priority = Column(String(20), default="Medium")
    assignee_id = Column(String(50), nullable=True)
    assigned_by_id = Column(String(50), default="MGR-01")
    supervisor_id = Column(String(50), nullable=True)
    manager_note = Column(Text, default="")
    specialization_required = Column(String(100), nullable=True)
    spare_parts = Column(Text, default="")
    consumed_part_id = Column(String(50), nullable=True)
    consumed_part_qty = Column(Integer, default=0)
    safety_instructions = Column(Text, default="")
    worker_notes = Column(Text, default="")
    blocked_reason = Column(Text, default="")
    verification_notes = Column(Text, default="")
    status = Column(String(50), default="pending_admin") # pending_admin, assigned_to_supervisor, assigned_to_worker, accepted, in_progress, blocked, awaiting_verification, closed
    created_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    due_at = Column(String(50), default="")
    resolved_at = Column(String(50), nullable=True)
    impact_inr = Column(Float, default=0.0)
    timeline_json = Column(Text, default="[]")
    repair_snapshot_json = Column(Text, nullable=True)
    consumed_parts_json = Column(Text, default="[]")

class InventoryItemModel(Base):
    __tablename__ = "inventory_items"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(80), nullable=False, index=True) # Bearings, Hydraulic Seals, Electrical & Sensors, Robotics & Actuators, Lubricants & Coolants, Mechanical Drives, Pneumatics, Tooling & Chucks
    station_id = Column(String(20), default="ALL", index=True) # 'A', 'B', 'C', 'D', 'ALL'
    compatible_machines = Column(Text, default="[]") # JSON list of machine IDs e.g. ["M01", "M02"]
    stock_level = Column(Integer, default=10)
    min_threshold = Column(Integer, default=5)
    unit_cost_inr = Column(Float, default=1500.0)
    location_bin = Column(String(100), default="Bin A-01")
    lead_time_days = Column(Integer, default=2)
    supplier = Column(String(150), default="FactoryIQ Industrial Supplies")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NoticeModel(Base):
    __tablename__ = "notices"

    id = Column(String(50), primary_key=True, index=True)
    work_order_id = Column(String(50), nullable=False)
    kind = Column(String(50), default="assigned")
    worker_id = Column(String(50), nullable=False)
    worker_name = Column(String(100), nullable=False)
    target_role = Column(String(20), default="worker") # 'admin', 'supervisor', 'worker'
    station_id = Column(String(50), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    read = Column(Boolean, default=False)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Check migrations safely
    try:
        with SessionLocal() as db:
            if engine.name == "postgresql":
                migrations = [
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(50)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(50)",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS specialization_required VARCHAR(100)",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS spare_parts TEXT DEFAULT ''",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS consumed_part_id VARCHAR(50)",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS consumed_part_qty INTEGER DEFAULT 0",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS safety_instructions TEXT DEFAULT ''",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS worker_notes TEXT DEFAULT ''",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT ''",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT ''",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS repair_snapshot_json TEXT",
                    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS consumed_parts_json TEXT DEFAULT '[]'",
                    "ALTER TABLE machines ADD COLUMN IF NOT EXISTS thresholds_json TEXT",
                    "ALTER TABLE machines ADD COLUMN IF NOT EXISTS baseline_json TEXT",
                    "ALTER TABLE notices ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) DEFAULT 'worker'",
                    "ALTER TABLE notices ADD COLUMN IF NOT EXISTS station_id VARCHAR(50)"
                ]
                for stmt in migrations:
                    try:
                        db.execute(text(stmt))
                    except Exception:
                        pass
                db.commit()
            elif engine.name == "sqlite":
                existing = {row[1] for row in db.execute(text("PRAGMA table_info(machines)")).fetchall()}
                if "thresholds_json" not in existing:
                    db.execute(text("ALTER TABLE machines ADD COLUMN thresholds_json TEXT"))
                if "baseline_json" not in existing:
                    db.execute(text("ALTER TABLE machines ADD COLUMN baseline_json TEXT"))
                existing = {row[1] for row in db.execute(text("PRAGMA table_info(work_orders)")).fetchall()}
                if "repair_snapshot_json" not in existing:
                    db.execute(text("ALTER TABLE work_orders ADD COLUMN repair_snapshot_json TEXT"))
                if "consumed_parts_json" not in existing:
                    db.execute(text("ALTER TABLE work_orders ADD COLUMN consumed_parts_json TEXT DEFAULT '[]'"))
                db.commit()

            # Seed full snapshot (users, machines, work orders, inventory, notices) if empty
            seed_from_snapshot(db)
            # Fallback seed default inventory items if table is empty
            seed_inventory(db)
    except Exception as e:
        print(f"[DB] Migration notice: {e}")

def seed_from_snapshot(db):
    try:
        user_count = db.query(UserModel).count()
        if user_count > 0:
            return  # Database already has users

        seed_file = Path(__file__).resolve().parent / "seeds" / "factoryiq_seed.json"
        if not seed_file.exists():
            return

        with open(seed_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        for u in data.get("users", []):
            if "created_at" in u and u["created_at"]:
                u["created_at"] = datetime.fromisoformat(u["created_at"])
            db.add(UserModel(**u))

        for m in data.get("machines", []):
            if "last_maintenance" in m and m["last_maintenance"]:
                m["last_maintenance"] = datetime.fromisoformat(m["last_maintenance"])
            if "updated_at" in m and m["updated_at"]:
                m["updated_at"] = datetime.fromisoformat(m["updated_at"])
            db.add(MachineModel(**m))

        for w in data.get("work_orders", []):
            db.add(WorkOrderModel(**w))

        for i in data.get("inventory_items", []):
            if "created_at" in i and i["created_at"]:
                i["created_at"] = datetime.fromisoformat(i["created_at"])
            if "updated_at" in i and i["updated_at"]:
                i["updated_at"] = datetime.fromisoformat(i["updated_at"])
            db.add(InventoryItemModel(**i))

        for n in data.get("notices", []):
            if "created_at" in n and n["created_at"]:
                n["created_at"] = datetime.fromisoformat(n["created_at"])
            db.add(NoticeModel(**n))

        db.commit()
        print("[DB] Successfully seeded full dataset from factoryiq_seed.json!")
    except Exception as e:
        db.rollback()
        print(f"[DB] Seed error: {e}")

def seed_inventory(db):
    try:
        count = db.query(InventoryItemModel).count()
        if count > 0:
            return
        
        default_items = [
            # Station A (Machining: M01 - M13)
            InventoryItemModel(
                id="PART-A-BRG-6205",
                name="SKF High-Speed Angular Spindle Bearing 6205",
                category="Bearings",
                station_id="A",
                compatible_machines=json.dumps(["M01", "M02", "M03", "M04", "M07", "M08"]),
                stock_level=14,
                min_threshold=5,
                unit_cost_inr=2450.0,
                location_bin="Rack A-04, Bin 12",
                lead_time_days=2,
                supplier="SKF Bearings India Ltd."
            ),
            InventoryItemModel(
                id="PART-A-COL-ER32",
                name="ER32 Precision Collet Chuck Set (12-Piece)",
                category="Tooling & Chucks",
                station_id="A",
                compatible_machines=json.dumps(["M01", "M02", "M03", "M05", "M06"]),
                stock_level=8,
                min_threshold=4,
                unit_cost_inr=3200.0,
                location_bin="Rack A-08, Shelf 1",
                lead_time_days=3,
                supplier="Kennametal Tooling"
            ),
            InventoryItemModel(
                id="PART-A-SYN-COOL",
                name="Castrol Semi-Synthetic Bio-Stable Cutting Coolant (20L)",
                category="Lubricants & Coolants",
                station_id="A",
                compatible_machines=json.dumps(["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12", "M13"]),
                stock_level=22,
                min_threshold=8,
                unit_cost_inr=4800.0,
                location_bin="Station A Chemical Bay",
                lead_time_days=1,
                supplier="Castrol Industrial"
            ),
            InventoryItemModel(
                id="PART-A-ENC-OPT",
                name="Omron 1024 PPR Rotary Optical Shaft Encoder",
                category="Electrical & Sensors",
                station_id="A",
                compatible_machines=json.dumps(["M01", "M02", "M03", "M07", "M10"]),
                stock_level=4,
                min_threshold=3,
                unit_cost_inr=6800.0,
                location_bin="Rack A-12, Locker 3",
                lead_time_days=5,
                supplier="Omron Automation"
            ),
            InventoryItemModel(
                id="PART-A-PLAS-ELC",
                name="Hypertherm Powermax Plasma Nozzle & Electrode Kit",
                category="Tooling & Chucks",
                station_id="A",
                compatible_machines=json.dumps(["M12", "M13"]),
                stock_level=18,
                min_threshold=6,
                unit_cost_inr=1950.0,
                location_bin="Rack A-15, Bin 02",
                lead_time_days=2,
                supplier="Hypertherm Cutting Solutions"
            ),
            InventoryItemModel(
                id="PART-A-DRV-BELT",
                name="Gates High-Torque Synchronous Spindle Drive Belt",
                category="Mechanical Drives",
                station_id="A",
                compatible_machines=json.dumps(["M01", "M02", "M03", "M04", "M07", "M09"]),
                stock_level=3,
                min_threshold=5, # Low Stock Trigger
                unit_cost_inr=1400.0,
                location_bin="Rack A-02, Bin 07",
                lead_time_days=3,
                supplier="Gates Power Transmission"
            ),

            # Station B (Forming & Pressing: M14 - M25)
            InventoryItemModel(
                id="PART-B-SEAL-HYD",
                name="Parker 150mm High-Pressure Hydraulic Ram Seal Kit",
                category="Hydraulic Seals",
                station_id="B",
                compatible_machines=json.dumps(["M14", "M15", "M16", "M17", "M18", "M19"]),
                stock_level=6,
                min_threshold=4,
                unit_cost_inr=5600.0,
                location_bin="Rack B-03, Bin 09",
                lead_time_days=4,
                supplier="Parker Hannifin Corp"
            ),
            InventoryItemModel(
                id="PART-B-VLV-PROP",
                name="Bosch Rexroth Proportional Hydraulic Relief Valve 350 Bar",
                category="Hydraulic & Pneumatic",
                station_id="B",
                compatible_machines=json.dumps(["M14", "M15", "M18", "M20"]),
                stock_level=2,
                min_threshold=3, # Low Stock
                unit_cost_inr=18500.0,
                location_bin="Vault B-Secure-01",
                lead_time_days=7,
                supplier="Bosch Rexroth Hydraulics"
            ),
            InventoryItemModel(
                id="PART-B-OIL-ISO68",
                name="Shell Tellus S2 MX 68 Premium Hydraulic Fluid (200L Drum)",
                category="Lubricants & Coolants",
                station_id="B",
                compatible_machines=json.dumps(["M14", "M15", "M16", "M17", "M18", "M19", "M20", "M21", "M22", "M23", "M24", "M25"]),
                stock_level=5,
                min_threshold=3,
                unit_cost_inr=16200.0,
                location_bin="Station B Fluid Bay Drum #2",
                lead_time_days=2,
                supplier="Shell Lubricants India"
            ),
            InventoryItemModel(
                id="PART-B-HTR-BND",
                name="Ceramic Mica Extruder Band Heater 2.5kW 230V",
                category="Electrical & Sensors",
                station_id="B",
                compatible_machines=json.dumps(["M22", "M23", "M24", "M25"]),
                stock_level=9,
                min_threshold=4,
                unit_cost_inr=2800.0,
                location_bin="Rack B-11, Shelf 2",
                lead_time_days=3,
                supplier="Watlow Thermal Systems"
            ),
            InventoryItemModel(
                id="PART-B-DMP-PAD",
                name="Heavy Press Elastomeric Foundation Vibration Dampener",
                category="Mechanical Drives",
                station_id="B",
                compatible_machines=json.dumps(["M14", "M15", "M16", "M17"]),
                stock_level=1,
                min_threshold=4, # Critical Stock
                unit_cost_inr=3400.0,
                location_bin="Heavy Storage Bay B-02",
                lead_time_days=4,
                supplier="VibroDynamics Isolation"
            ),

            # Station C (Robotic Assembly & Welding: M26 - M38)
            InventoryItemModel(
                id="PART-C-HRM-DRV",
                name="Harmonic Drive CSF-25 Miniature High-Torque Gearhead",
                category="Robotics & Actuators",
                station_id="C",
                compatible_machines=json.dumps(["M26", "M27", "M28", "M29", "M30"]),
                stock_level=3,
                min_threshold=2,
                unit_cost_inr=42000.0,
                location_bin="Clean Room C-Cabinet 1",
                lead_time_days=10,
                supplier="Harmonic Drive Systems"
            ),
            InventoryItemModel(
                id="PART-C-LSR-NZL",
                name="Precitec Ceramic Laser Weld & Cutting Nozzle 1.5mm",
                category="Tooling & Chucks",
                station_id="C",
                compatible_machines=json.dumps(["M31", "M32", "M33", "M34"]),
                stock_level=25,
                min_threshold=10,
                unit_cost_inr=1650.0,
                location_bin="Rack C-05, Bin 18",
                lead_time_days=2,
                supplier="Precitec Optics"
            ),
            InventoryItemModel(
                id="PART-C-PNE-GRP",
                name="SMC MHZ2-20D Parallel Pneumatic Robot Gripper Finger Kit",
                category="Pneumatics",
                station_id="C",
                compatible_machines=json.dumps(["M26", "M27", "M35", "M36", "M37"]),
                stock_level=7,
                min_threshold=3,
                unit_cost_inr=4200.0,
                location_bin="Rack C-08, Bin 04",
                lead_time_days=3,
                supplier="SMC Pneumatics India"
            ),
            InventoryItemModel(
                id="PART-C-OPT-SEN",
                name="Keyence PR-M Photoelectric Laser Proximity Sensor",
                category="Electrical & Sensors",
                station_id="C",
                compatible_machines=json.dumps(["M26", "M28", "M30", "M35", "M38"]),
                stock_level=2,
                min_threshold=4, # Low Stock
                unit_cost_inr=8900.0,
                location_bin="Rack C-Sensor-Drawer 2",
                lead_time_days=5,
                supplier="Keyence India"
            ),
            InventoryItemModel(
                id="PART-C-WLD-LIN",
                name="Robotic MIG Weld Wire Condux Conduit Liner 15ft",
                category="Consumables",
                station_id="C",
                compatible_machines=json.dumps(["M28", "M29", "M30"]),
                stock_level=12,
                min_threshold=5,
                unit_cost_inr=950.0,
                location_bin="Rack C-14, Bin 08",
                lead_time_days=2,
                supplier="Tregaskiss Robotics"
            ),

            # Station D (Finishing, Inspection & Packaging: M39 - M50)
            InventoryItemModel(
                id="PART-D-CAM-LNS",
                name="Basler Premium 16mm C-Mount Machine Vision AOI Lens",
                category="Electrical & Sensors",
                station_id="D",
                compatible_machines=json.dumps(["M39", "M40", "M41", "M42"]),
                stock_level=4,
                min_threshold=2,
                unit_cost_inr=12400.0,
                location_bin="Optics Bay D-Cabinet A",
                lead_time_days=6,
                supplier="Basler AG Vision Components"
            ),
            InventoryItemModel(
                id="PART-D-IR-HEAT",
                name="Heraeus 2kW Medium-Wave Quartz Infrared Curing Tube",
                category="Electrical & Sensors",
                station_id="D",
                compatible_machines=json.dumps(["M43", "M44", "M45", "M46"]),
                stock_level=8,
                min_threshold=4,
                unit_cost_inr=3850.0,
                location_bin="Thermal Spares D-03",
                lead_time_days=3,
                supplier="Heraeus Noblelight"
            ),
            InventoryItemModel(
                id="PART-D-ROB-SUC",
                name="Schmalz SPB1 40mm Bellows Vacuum Suction Pad Kit (Pack of 10)",
                category="Pneumatics",
                station_id="D",
                compatible_machines=json.dumps(["M47", "M48", "M49", "M50"]),
                stock_level=16,
                min_threshold=8,
                unit_cost_inr=850.0,
                location_bin="Rack D-09, Bin 02",
                lead_time_days=2,
                supplier="Schmalz Vacuum Technology"
            ),
            InventoryItemModel(
                id="PART-D-CNV-BLT",
                name="Habasit Anti-Static High-Grip Sorting Conveyor Belt Section",
                category="Mechanical Drives",
                station_id="D",
                compatible_machines=json.dumps(["M39", "M42", "M47", "M50"]),
                stock_level=3,
                min_threshold=3, # Low Stock
                unit_cost_inr=5200.0,
                location_bin="Roller Bay D-01",
                lead_time_days=4,
                supplier="Habasit Belting"
            ),

            # Plant-Wide General Consumables (ALL)
            InventoryItemModel(
                id="PART-ALL-MNT-KIT",
                name="FactoryIQ Universal Grade 8.8 Fastener, Circlip & O-Ring Assortment",
                category="General Hardware",
                station_id="ALL",
                compatible_machines=json.dumps([f"M{str(i).zfill(2)}" for i in range(1, 51)]),
                stock_level=30,
                min_threshold=10,
                unit_cost_inr=1200.0,
                location_bin="Central Store - Aisle 1, Rack C",
                lead_time_days=1,
                supplier="Unbrako Fasteners"
            ),
            InventoryItemModel(
                id="PART-ALL-GRE-SYN",
                name="Mobilith SHC 220 Extreme-Pressure Synthetic Grease (18kg Pail)",
                category="Lubricants & Coolants",
                station_id="ALL",
                compatible_machines=json.dumps([f"M{str(i).zfill(2)}" for i in range(1, 51)]),
                stock_level=20,
                min_threshold=8,
                unit_cost_inr=1850.0,
                location_bin="Central Store - Flammables Room",
                lead_time_days=1,
                supplier="ExxonMobil Industrial"
            )
        ]

        db.add_all(default_items)
        db.commit()
        print(f"[DB] Successfully seeded {len(default_items)} industrial spare parts into inventory_items.")
    except Exception as e:
        db.rollback()
        print(f"[DB] Error seeding inventory: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
