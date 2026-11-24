import time
import random
import threading
import json
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database import SessionLocal, MachineModel, TelemetryHistoryModel, WorkOrderModel, NoticeModel, UserModel, InventoryItemModel, engine, Base
from backend.risk import estimate_rupees_at_risk

ALL_50_MACHINES = [
    # Station A: Machining & Fabrication (M01 - M13)
    {"id": "M01", "name": "CNC Lathe Alpha", "type": "CNC Machining", "station": "A", "base_temp": 54.0, "base_vib": 1.1, "base_power": 12.5, "base_rpm": 1500, "status": "normal"},
    {"id": "M02", "name": "CNC Milling Centre 1", "type": "CNC Machining", "station": "A", "base_temp": 56.5, "base_vib": 1.3, "base_power": 14.0, "base_rpm": 2200, "status": "normal"},
    {"id": "M03", "name": "Radial Drilling Machine", "type": "Drilling", "station": "A", "base_temp": 48.0, "base_vib": 0.8, "base_power": 9.2, "base_rpm": 950, "status": "normal"},
    {"id": "M04", "name": "Plasma Cutting Table", "type": "Thermal Cutting", "station": "A", "base_temp": 62.0, "base_vib": 0.9, "base_power": 18.5, "base_rpm": 0, "status": "normal"},
    {"id": "M05", "name": "Heavy Duty Lathe", "type": "CNC Machining", "station": "A", "base_temp": 55.0, "base_vib": 1.2, "base_power": 16.0, "base_rpm": 1200, "status": "normal"},
    {"id": "M06", "name": "Surface Grinder", "type": "Grinding", "station": "A", "base_temp": 50.0, "base_vib": 1.5, "base_power": 11.0, "base_rpm": 2800, "status": "normal"},
    # M07 is the star from our PPT! Vibration climbing, bearing degradation
    {"id": "M07", "name": "Air Compressor 1", "type": "Pneumatics", "station": "A", "base_temp": 68.5, "base_vib": 4.85, "base_power": 19.8, "base_rpm": 1450, "status": "critical", "failure_risk": 64, "rupees_at_risk": 33750.0, "recommended_action": "Urgent: Inspect bearing wear & lubrication. High failure probability within shift."},
    {"id": "M08", "name": "CNC Lathe Beta", "type": "CNC Machining", "station": "A", "base_temp": 53.0, "base_vib": 1.0, "base_power": 13.0, "base_rpm": 1500, "status": "normal"},
    {"id": "M09", "name": "Horizontal Boring Machine", "type": "Boring", "station": "A", "base_temp": 58.0, "base_vib": 1.4, "base_power": 15.5, "base_rpm": 800, "status": "normal"},
    {"id": "M10", "name": "Gear Hobbing Unit", "type": "Gear Cutting", "station": "A", "base_temp": 52.0, "base_vib": 1.1, "base_power": 10.5, "base_rpm": 1100, "status": "normal"},
    {"id": "M11", "name": "Band Saw Cutter", "type": "Cutting", "station": "A", "base_temp": 46.0, "base_vib": 0.7, "base_power": 8.0, "base_rpm": 600, "status": "normal"},
    {"id": "M12", "name": "CNC Turret Lathe", "type": "CNC Machining", "station": "A", "base_temp": 55.5, "base_vib": 1.2, "base_power": 13.8, "base_rpm": 1650, "status": "normal"},
    {"id": "M13", "name": "Spindle Milling Station", "type": "Milling", "station": "A", "base_temp": 57.0, "base_vib": 1.3, "base_power": 14.2, "base_rpm": 2400, "status": "normal"},

    # Station B: Forming & Pressing (M14 - M25)
    {"id": "M14", "name": "Hydraulic Press 50T", "type": "Pressing", "station": "B", "base_temp": 61.0, "base_vib": 1.6, "base_power": 17.5, "base_rpm": 0, "status": "normal"},
    {"id": "M15", "name": "Stamping Press Alpha", "type": "Stamping", "station": "B", "base_temp": 64.0, "base_vib": 2.2, "base_power": 19.0, "base_rpm": 0, "status": "normal"},
    {"id": "M16", "name": "Injection Moulder 1", "type": "Moulding", "station": "B", "base_temp": 73.0, "base_vib": 2.1, "base_power": 19.5, "base_rpm": 1200, "status": "warning", "failure_risk": 38, "rupees_at_risk": 14200.0, "recommended_action": "Check cooling circuit and clean thermal dissipation radiators."},
    {"id": "M17", "name": "Hydraulic Press B", "type": "Pressing", "station": "B", "base_temp": 63.5, "base_vib": 1.8, "base_power": 18.0, "base_rpm": 0, "status": "normal"},
    {"id": "M18", "name": "Stamping Press 2", "type": "Pressing", "station": "B", "base_temp": 67.0, "base_vib": 4.6, "base_power": 21.0, "base_rpm": 0, "status": "warning", "failure_risk": 44, "rupees_at_risk": 18500.0, "recommended_action": "Check guide bushing clearances and foundation dampening pads."},
    {"id": "M19", "name": "Deep Drawing Press", "type": "Drawing", "station": "B", "base_temp": 65.0, "base_vib": 1.9, "base_power": 20.0, "base_rpm": 0, "status": "normal"},
    {"id": "M20", "name": "Extrusion Press 1", "type": "Extrusion", "station": "B", "base_temp": 71.0, "base_vib": 2.0, "base_power": 22.5, "base_rpm": 450, "status": "normal"},
    {"id": "M21", "name": "Sheet Metal Bender", "type": "Bending", "station": "B", "base_temp": 49.0, "base_vib": 0.9, "base_power": 10.0, "base_rpm": 0, "status": "normal"},
    {"id": "M22", "name": "Injection Moulder 2", "type": "Moulding", "station": "B", "base_temp": 69.0, "base_vib": 1.7, "base_power": 18.5, "base_rpm": 1200, "status": "normal"},
    {"id": "M23", "name": "Mechanical Press 100T", "type": "Pressing", "station": "B", "base_temp": 66.0, "base_vib": 2.4, "base_power": 24.0, "base_rpm": 0, "status": "normal"},
    {"id": "M24", "name": "Roll Forming Line", "type": "Roll Forming", "station": "B", "base_temp": 58.0, "base_vib": 1.5, "base_power": 15.0, "base_rpm": 600, "status": "normal"},
    {"id": "M25", "name": "Thermoforming Unit", "type": "Thermoforming", "station": "B", "base_temp": 74.0, "base_vib": 1.2, "base_power": 16.5, "base_rpm": 0, "status": "normal"},

    # Station C: Assembly, Robotics & Welding (M26 - M38) - Note: Assembly is Bottleneck Station
    {"id": "M26", "name": "Assembly Robot 1", "type": "Robotics", "station": "C", "base_temp": 52.0, "base_vib": 0.8, "base_power": 11.0, "base_rpm": 0, "status": "normal"},
    {"id": "M27", "name": "Conveyor Motor 1", "type": "Material Handling", "station": "C", "base_temp": 78.5, "base_vib": 5.4, "base_power": 22.5, "base_rpm": 1420, "status": "critical", "failure_risk": 72, "rupees_at_risk": 41200.0, "recommended_action": "Inspect drive motor alignment and replace bearing housing."},
    {"id": "M28", "name": "Robotic Spot Welder A", "type": "Welding", "station": "C", "base_temp": 64.0, "base_vib": 1.1, "base_power": 25.0, "base_rpm": 0, "status": "normal"},
    {"id": "M29", "name": "Pick & Place Arm 1", "type": "Robotics", "station": "C", "base_temp": 49.0, "base_vib": 0.7, "base_power": 7.5, "base_rpm": 0, "status": "normal"},
    {"id": "M30", "name": "Assembly Robot 2", "type": "Assembly", "station": "C", "base_temp": 68.0, "base_vib": 3.8, "base_power": 20.0, "base_rpm": 0, "status": "critical", "failure_risk": 58, "rupees_at_risk": 28400.0, "recommended_action": "Check joint actuators and harmonic drive backlash."},
    {"id": "M31", "name": "Ultrasonic Welder", "type": "Welding", "station": "C", "base_temp": 56.0, "base_vib": 1.0, "base_power": 12.0, "base_rpm": 0, "status": "normal"},
    {"id": "M32", "name": "Rotary Indexing Table", "type": "Material Handling", "station": "C", "base_temp": 51.0, "base_vib": 0.9, "base_power": 8.5, "base_rpm": 45, "status": "normal"},
    {"id": "M33", "name": "Conveyor Motor 2", "type": "Material Handling", "station": "C", "base_temp": 59.0, "base_vib": 1.4, "base_power": 13.0, "base_rpm": 1450, "status": "normal"},
    {"id": "M34", "name": "Fastening Station", "type": "Assembly", "station": "C", "base_temp": 47.0, "base_vib": 0.6, "base_power": 6.5, "base_rpm": 0, "status": "normal"},
    {"id": "M35", "name": "Automated Riveting Rig", "type": "Fastening", "station": "C", "base_temp": 54.0, "base_vib": 1.8, "base_power": 14.5, "base_rpm": 0, "status": "normal"},
    {"id": "M36", "name": "Robotic Spot Welder B", "type": "Welding", "station": "C", "base_temp": 62.0, "base_vib": 1.0, "base_power": 23.0, "base_rpm": 0, "status": "normal"},
    {"id": "M37", "name": "Laser Welding Cell", "type": "Welding", "station": "C", "base_temp": 65.0, "base_vib": 0.5, "base_power": 28.0, "base_rpm": 0, "status": "normal"},
    {"id": "M38", "name": "Sub-Assembly Turntable", "type": "Material Handling", "station": "C", "base_temp": 48.0, "base_vib": 0.8, "base_power": 7.0, "base_rpm": 30, "status": "normal"},

    # Station D: Finishing, Inspection & Packaging (M39 - M50)
    {"id": "M39", "name": "Quality Scanner Alpha", "type": "Inspection", "station": "D", "base_temp": 51.0, "base_vib": 0.4, "base_power": 7.5, "base_rpm": 0, "status": "normal"},
    {"id": "M40", "name": "Paint Booth Fan", "type": "Ventilation", "station": "D", "base_temp": 71.0, "base_vib": 4.2, "base_power": 15.0, "base_rpm": 1750, "status": "warning", "failure_risk": 42, "rupees_at_risk": 16800.0, "recommended_action": "Check impeller balancing and belt tensioning."},
    {"id": "M41", "name": "Automated Curing Oven", "type": "Curing", "station": "D", "base_temp": 88.0, "base_vib": 0.6, "base_power": 32.0, "base_rpm": 0, "status": "normal"},
    {"id": "M42", "name": "Optical Inspection Rig", "type": "Inspection", "station": "D", "base_temp": 46.0, "base_vib": 0.3, "base_power": 5.0, "base_rpm": 0, "status": "normal"},
    {"id": "M43", "name": "Packaging Line 1", "type": "Packaging", "station": "D", "base_temp": 55.0, "base_vib": 0.9, "base_power": 14.0, "base_rpm": 850, "status": "normal"},
    {"id": "M44", "name": "Automated Carton Sealer", "type": "Packaging", "station": "D", "base_temp": 52.0, "base_vib": 0.8, "base_power": 8.0, "base_rpm": 0, "status": "normal"},
    {"id": "M45", "name": "Shrink Wrapping Unit", "type": "Packaging", "station": "D", "base_temp": 68.0, "base_vib": 0.7, "base_power": 16.0, "base_rpm": 0, "status": "normal"},
    {"id": "M46", "name": "Robotic Palletizer 1", "type": "Palletizing", "station": "D", "base_temp": 50.0, "base_vib": 0.7, "base_power": 11.5, "base_rpm": 0, "status": "normal"},
    {"id": "M47", "name": "Powder Coating Spray Unit", "type": "Coating", "station": "D", "base_temp": 58.0, "base_vib": 1.1, "base_power": 13.0, "base_rpm": 0, "status": "normal"},
    {"id": "M48", "name": "Exhaust Filtration Unit", "type": "Filtration", "station": "D", "base_temp": 54.0, "base_vib": 1.4, "base_power": 12.0, "base_rpm": 1450, "status": "normal"},
    {"id": "M49", "name": "Vision Sorting Conveyor", "type": "Sorting", "station": "D", "base_temp": 49.0, "base_vib": 0.8, "base_power": 9.0, "base_rpm": 1200, "status": "normal"},
    {"id": "M50", "name": "Final Dispatch Labeller", "type": "Labelling", "station": "D", "base_temp": 45.0, "base_vib": 0.5, "base_power": 4.5, "base_rpm": 0, "status": "normal"},
]

def seed_50_machines():
    """Initializes or updates the machines table to ensure all 50 machines exist and have correct configurations."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Synchronizing all 50 machines into PostgreSQL...")
        for spec in ALL_50_MACHINES:
            m = db.query(MachineModel).filter(MachineModel.id == spec["id"]).first()
            if not m:
                m = MachineModel(
                    id=spec["id"],
                    name=spec["name"],
                    type=spec["type"],
                    station=spec["station"],
                    status=spec.get("status", "normal"),
                    temperature=spec["base_temp"],
                    temp_bearing=spec["base_temp"] - 2.5,
                    temp_motor=spec["base_temp"] + 3.0,
                    vibration=spec["base_vib"],
                    power=spec["base_power"],
                    load_pct=round(random.uniform(65, 88), 1),
                    shaft_rpm=spec["base_rpm"],
                    health_score=45.0 if spec.get("status") == "critical" else (72.0 if spec.get("status") == "warning" else 94.0),
                    failure_risk=spec.get("failure_risk", 12),
                    rupees_at_risk=spec.get("rupees_at_risk", 0.0),
                    recommended_action=spec.get("recommended_action", "No action required. Routine preventive maintenance."),
                    priority="Critical" if spec.get("status") == "critical" else ("Medium" if spec.get("status") == "warning" else "Low"),
                    updated_at=datetime.utcnow()
                )
                db.add(m)
            # Existing machine state is operational data. Never reseed it on
            # startup, because doing so can undo a verified repair.
        db.commit()
        print("Successfully synchronized all 50 machines into PostgreSQL!")
    except Exception as e:
        print(f"Error seeding machines: {e}")
        db.rollback()
    finally:
        db.close()


def reconcile_legacy_simulator_data():
    """Restore untouched rows that the old conflicting ID catalog overwrote.

    Only normal machines with no human work-order history are eligible. The
    legacy baseline must also match the old simulator's per-ID values, which
    makes this a one-time, narrowly scoped correction rather than a reseed of
    operational or repaired machines.
    """
    seed_path = Path(__file__).resolve().parent / "seeds" / "factoryiq_seed.json"
    if not seed_path.exists():
        return
    with seed_path.open("r", encoding="utf-8") as stream:
        canonical = {row["id"]: row for row in json.load(stream).get("machines", [])}
    legacy_by_id = {row["id"]: row for row in ALL_50_MACHINES}
    now = datetime.utcnow()
    db = SessionLocal()
    corrected = []
    cancelled = []
    try:
        for machine in db.query(MachineModel).all():
            expected = canonical.get(machine.id)
            legacy = legacy_by_id.get(machine.id)
            if not expected or not legacy or expected.get("status", "normal") != "normal":
                continue
            if (machine.recommended_action or "").startswith("Repair verified by supervisor."):
                continue
            try:
                baseline = json.loads(machine.baseline_json or "{}")
            except (TypeError, json.JSONDecodeError):
                continue
            legacy_match = (
                abs(float(baseline.get("temperature", -1000)) - legacy["base_temp"]) <= 3.0
                and abs(float(baseline.get("vibration", -1000)) - legacy["base_vib"]) <= 0.4
                and abs(float(baseline.get("power", -1000)) - legacy["base_power"]) <= 1.5
            )
            material_mismatch = (
                abs(legacy["base_temp"] - float(expected["temperature"])) >= 4.0
                or abs(legacy["base_vib"] - float(expected["vibration"])) >= 0.5
                or abs(legacy["base_power"] - float(expected["power"])) >= 4.0
            )
            if not legacy_match or not material_mismatch:
                continue

            orders = db.query(WorkOrderModel).filter(WorkOrderModel.machine_id == machine.id).all()
            false_ai_orders = [
                order for order in orders
                if order.id.startswith("WO-AI-")
                and order.status == "assigned_to_worker"
                and not (order.worker_notes or "").strip()
                and all(event.get("kind") == "auto_assigned" for event in json.loads(order.timeline_json or "[]"))
            ]
            if any(order not in false_ai_orders for order in orders):
                continue
            if orders and len(false_ai_orders) != len(orders):
                continue

            machine.temperature = float(expected["temperature"])
            machine.temp_bearing = float(expected["temp_bearing"])
            machine.temp_motor = float(expected["temp_motor"])
            machine.vibration = float(expected["vibration"])
            machine.power = float(expected["power"])
            machine.load_pct = float(expected.get("load_pct", machine.load_pct))
            machine.shaft_rpm = float(expected.get("shaft_rpm", machine.shaft_rpm))
            machine.downtime_hours = float(expected.get("downtime_hours", 0.0))
            machine.downtime_events = int(expected.get("downtime_events", 0))
            machine.baseline_json = json.dumps({
                "temperature": machine.temperature,
                "temp_bearing": machine.temp_bearing,
                "temp_motor": machine.temp_motor,
                "vibration": machine.vibration,
                "power": machine.power,
            })
            machine.status = "normal"
            machine.health_score = float(expected.get("health_score", 94.0))
            machine.failure_risk = min(int(expected.get("failure_risk", 8)), 15)
            machine.anomaly_score = float(expected.get("anomaly_score", 0.1))
            machine.rupees_at_risk = 0.0
            machine.priority = "Low"
            machine.recommended_action = "No action required. Current readings are within configured limits; continue routine monitoring."
            machine.updated_at = now
            db.add(TelemetryHistoryModel(
                timestamp=now, machine_id=machine.id, station=machine.station,
                temperature=machine.temperature, temp_bearing=machine.temp_bearing,
                temp_motor=machine.temp_motor, vibration=machine.vibration,
                power=machine.power, load_pct=machine.load_pct, shaft_rpm=machine.shaft_rpm,
                failure_risk=machine.failure_risk, rupees_at_risk=0.0, status="normal",
            ))
            corrected.append(machine.id)

            for order in false_ai_orders:
                order.status = "cancelled"
                order.resolved_at = now.isoformat()
                order.verification_notes = "Cancelled as a false alert: the legacy simulator had applied another machine's baseline to this ID. Canonical dataset readings were restored; no repair was performed."
                timeline = json.loads(order.timeline_json or "[]")
                timeline.append({
                    "at": now.isoformat(), "by": "SYSTEM", "byName": "FactoryIQ Data Reconciliation",
                    "kind": "cancelled_false_alert",
                    "message": "False alert cancelled after restoring this machine's canonical dataset readings. No worker repair was performed.",
                })
                order.timeline_json = json.dumps(timeline)
                cancelled.append(order.id)

        db.commit()
        if corrected:
            print(f"[DB] Restored canonical telemetry for untouched legacy rows: {', '.join(corrected)}")
        if cancelled:
            print(f"[DB] Cancelled false AI alerts: {', '.join(cancelled)}")
    except Exception as error:
        db.rollback()
        print(f"[DB] Legacy telemetry reconciliation failed safely: {error}")
    finally:
        db.close()

_simulation_running = False

_tick_count = 0

def update_telemetry_step():
    """Simulates live physical variations for all 50 machines and logs time-series records."""
    global _tick_count
    _tick_count += 1
    db = SessionLocal()
    try:
        machines = db.query(MachineModel).all()
        now = datetime.utcnow()
        for m in machines:
            # Persisted machine readings are the baseline. The old simulator
            # looked up a second, conflicting machine catalog by ID and
            # overwrote repairs and seed data every five seconds.
            if not m.baseline_json:
                m.baseline_json = json.dumps({"temperature": m.temperature, "temp_bearing": m.temp_bearing, "temp_motor": m.temp_motor, "vibration": m.vibration, "power": m.power})
            baseline = json.loads(m.baseline_json)
            if m.type.lower() == "curing" or "oven" in m.name.lower():
                thresholds = json.loads(m.thresholds_json or "{}")
                thresholds.update({"tempWarn": 105, "tempCritical": 125, "powerWarn": 38, "powerCritical": 46})
                m.thresholds_json = json.dumps(thresholds)
            base_temp = float(baseline.get("temperature", m.temperature))
            base_vib = float(baseline.get("vibration", m.vibration))
            base_power = float(baseline.get("power", m.power))

            # Realistic physical micro-fluctuations (jitter)
            temp_jitter = round(random.uniform(-0.3, 0.4), 2)
            vib_jitter = round(random.uniform(-0.04, 0.05), 3)
            power_jitter = round(random.uniform(-0.25, 0.3), 2)

            # Update live machine values
            new_temp = round(base_temp + temp_jitter, 1)
            new_vib = max(0.1, round(base_vib + vib_jitter, 2))
            new_power = max(1.0, round(base_power + power_jitter, 1))

            m.temperature = new_temp
            m.temp_bearing = round(float(baseline.get("temp_bearing", base_temp - 2.5)) + random.uniform(-0.2, 0.2), 1)
            m.temp_motor = round(float(baseline.get("temp_motor", base_temp + 3.2)) + random.uniform(-0.2, 0.2), 1)
            m.vibration = new_vib
            m.power = new_power
            m.updated_at = now

            # Reclassify from this machine's persisted thresholds on every
            # sample, so warnings/critical states can both escalate and clear.
            thresholds = json.loads(m.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
            measured_status = "normal"
            if new_temp >= thresholds["tempCritical"] or m.temp_bearing >= thresholds["tempCritical"] or m.temp_motor >= thresholds["tempCritical"] or new_vib >= thresholds["vibCritical"] or new_power >= thresholds["powerCritical"]:
                measured_status = "critical"
            elif (m.downtime_events or 0) >= 5 or (m.downtime_hours or 0) >= 10:
                measured_status = "critical"
            elif new_temp >= thresholds["tempWarn"] or m.temp_bearing >= thresholds["tempWarn"] or m.temp_motor >= thresholds["tempWarn"] or new_vib >= thresholds["vibWarn"] or new_power >= thresholds["powerWarn"]:
                measured_status = "warning"
            elif (m.downtime_events or 0) >= 4:
                measured_status = "warning"
            m.status = measured_status
            m.failure_risk = {"normal": 8, "warning": 38, "critical": 68}[measured_status]
            m.rupees_at_risk = estimate_rupees_at_risk(m, measured_status, thresholds)
            m.priority = {"normal": "Low", "warning": "Medium", "critical": "Critical"}[measured_status]
            m.health_score = {"normal": 94.0, "warning": 72.0, "critical": 45.0}[measured_status]
            if measured_status == "normal":
                m.recommended_action = "No action required. Current readings are within configured limits; continue routine monitoring."
            elif measured_status == "critical":
                m.recommended_action = "Urgent: isolate and inspect the critical sensor fault, then verify readings after repair."
            else:
                m.recommended_action = "Schedule inspection of readings above the warning limit and monitor the next telemetry samples."

            # Record time-series historical snapshot every 4th tick (~every 20s) to reduce DB writes
            if _tick_count % 4 == 0:
                history_entry = TelemetryHistoryModel(
                    timestamp=now,
                    machine_id=m.id,
                    station=m.station,
                    temperature=m.temperature,
                    temp_bearing=m.temp_bearing,
                    temp_motor=m.temp_motor,
                    vibration=m.vibration,
                    power=m.power,
                    load_pct=m.load_pct,
                    shaft_rpm=m.shaft_rpm,
                    failure_risk=m.failure_risk,
                    rupees_at_risk=m.rupees_at_risk,
                    status=m.status
                )
                db.add(history_entry)

        # Every new critical machine condition receives one live work order.
        # Existing active orders suppress duplicates, including during reloads.
        for m in machines:
            if m.status != "critical":
                continue
            active_orders = db.query(WorkOrderModel).filter(
                WorkOrderModel.machine_id == m.id,
                WorkOrderModel.status.notin_(("closed", "resolved", "cancelled")),
            ).order_by(WorkOrderModel.created_at.desc()).all()
            if any(order.assignee_id for order in active_orders):
                continue
            active = active_orders[0] if active_orders else None
            fault_thresholds = json.loads(m.thresholds_json or '{"tempWarn":70,"tempCritical":85,"vibWarn":4,"vibCritical":7,"powerWarn":18,"powerCritical":24}')
            faults = []
            specialization = "General Maintenance"
            if m.temperature >= fault_thresholds["tempCritical"] or m.temp_bearing >= fault_thresholds["tempCritical"] or m.temp_motor >= fault_thresholds["tempCritical"]:
                faults.append("temperature"); specialization = "Mechanical Maintenance"
            if m.vibration >= fault_thresholds["vibCritical"]:
                faults.append("vibration"); specialization = "Mechanical Maintenance"
            if m.power >= fault_thresholds["powerCritical"]:
                faults.append("power draw"); specialization = "Electrical Maintenance"
            if not faults and ((m.downtime_events or 0) >= 5 or (m.downtime_hours or 0) >= 10):
                faults.append("downtime")
            needs_spare = any(fault != "downtime" for fault in faults)
            title = f"Critical {', '.join(faults) or 'machine health'} fault: {m.name}"
            inventory = db.query(InventoryItemModel).filter(InventoryItemModel.station_id.in_((m.station, "ALL"))).all()
            compatible_parts = []
            for item in inventory:
                compatible = json.loads(item.compatible_machines or "[]")
                if not compatible or m.id in compatible:
                    category = f"{item.category} {item.name}".lower()
                    keyword_match = any(word in category for word in ("bearing", "drive", "lubricant", "coolant", "motor", "electrical", "sensor"))
                    compatible_parts.append((item, keyword_match, bool(compatible)))
            compatible_parts.sort(key=lambda entry: (entry[0].stock_level > 0, entry[1], entry[2], entry[0].stock_level), reverse=True)
            spare = compatible_parts[0][0] if compatible_parts and needs_spare else None
            worker_pool = db.query(UserModel).filter(UserModel.role == "worker", UserModel.station_id == m.station).all()
            if not worker_pool:
                worker_pool = db.query(UserModel).filter(UserModel.role == "worker").all()
            open_counts = {}
            for candidate in worker_pool:
                open_counts[candidate.id] = db.query(WorkOrderModel).filter(
                    WorkOrderModel.assignee_id == candidate.id,
                    WorkOrderModel.status.in_(("assigned_to_worker", "accepted", "in_progress")),
                ).count()
            suitable = sorted((w for w in worker_pool if w.available), key=lambda w: (w.specialization != specialization, open_counts.get(w.id, 0)))
            worker = suitable[0] if suitable and (not needs_spare or (spare and spare.stock_level > 0)) else None
            supervisor = db.query(UserModel).filter(UserModel.role == "supervisor", UserModel.station_id == m.station).first()
            order_id = active.id if active else f"WO-AI-{m.id}-{int(now.timestamp())}-{random.randint(100,999)}"
            message = (f"Critical threshold fault detected; {spare.name} suggested and assigned to {worker.name}." if spare else f"Critical downtime condition automatically assigned to {worker.name}.") if worker else (f"Critical fault held until compatible spare part {spare.id} is restocked." if needs_spare and spare and spare.stock_level <= 0 else (f"Compatible stock {spare.name} is available; waiting for an eligible worker." if spare else "Critical threshold fault detected; no eligible worker or compatible spare is currently available."))
            order = active or WorkOrderModel(id=order_id, issue_key=f"machine:{m.id}:threshold-fault", source="machine", machine_id=m.id, station_id=m.station, created_at=now.isoformat())
            order.title = title
            order.detail = f"Current readings crossed this machine's configured limits or its reporting-period downtime limit. Readings: temperature {m.temperature}°C, vibration {m.vibration}, power {m.power} kW; downtime: {m.downtime_hours} hours across {m.downtime_events} events."
            order.action = f"Inspect {', '.join(faults) or 'machine condition'}, repair the root cause, then verify readings against configured thresholds."
            order.severity = "critical"
            order.priority = "Critical"
            order.specialization_required = specialization if faults else "General Maintenance"
            order.spare_parts = f"{spare.id} — {spare.name}" if spare else ""
            order.blocked_reason = f"Waiting for compatible spare part {spare.id}." if spare and spare.stock_level <= 0 else ""
            order.assignee_id = worker.id if worker else None
            order.supervisor_id = (worker.supervisor_id if worker and worker.supervisor_id else supervisor.id if supervisor else None)
            order.assigned_by_id = "AI_DISPATCH"
            order.status = "assigned_to_worker" if worker else ("blocked" if spare and spare.stock_level <= 0 else "pending_admin")
            order.impact_inr = m.rupees_at_risk
            order.due_at = (now + timedelta(hours=4)).isoformat()
            timeline = json.loads(order.timeline_json or "[]") if active else []
            timeline.append({"at": now.isoformat(), "by": "AI_DISPATCH", "byName": "FactoryIQ AI", "kind": "auto_assigned" if worker else ("blocked" if spare else "created"), "message": message})
            order.timeline_json = json.dumps(timeline)
            if not active:
                db.add(order)
            if worker:
                db.add(NoticeModel(id=f"NOTIF-AI-{m.id}-{int(now.timestamp())}-{random.randint(100,999)}", work_order_id=order_id, kind="assigned", worker_id=worker.id, worker_name=worker.name, target_role="worker", station_id=m.station, title=f"AI assigned critical repair: {m.name}", message=f"{title}. Assigned based on station, specialization, availability, and current workload."))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error in telemetry update: {e}")
    finally:
        db.close()

def start_background_stream(interval_seconds=5):
    """Starts the continuous 24/7 background telemetry simulation loop."""
    global _simulation_running
    if _simulation_running:
        return
    _simulation_running = True

    def loop():
        print(f"Live Telemetry Streamer started! Updating all 50 machines every {interval_seconds} seconds.")
        while _simulation_running:
            try:
                update_telemetry_step()
            except Exception as ex:
                print(f"Telemetry stream error: {ex}")
            time.sleep(interval_seconds)

    t = threading.Thread(target=loop, daemon=True)
    t.start()
