"""Isolated API integration checks for assignment and machine state sync.

Run with: python test_workflow.py
The suite uses a temporary SQLite database and does not modify factoryiq.db.
"""
import json
import atexit
import os
import tempfile
import uuid
from pathlib import Path

_test_db_dir = tempfile.TemporaryDirectory(prefix="factoryiq-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{(Path(_test_db_dir.name) / 'factoryiq.sqlite').as_posix()}"

from backend import main as app_module  # noqa: E402
from backend.database import MachineModel, InventoryItemModel, WorkOrderModel, SessionLocal, engine  # noqa: E402
from backend.main import (  # noqa: E402
    AdminAssignSupervisorRequest,
    DirectMachineResolveRequest,
    SupervisorAssignWorkerRequest,
    SupervisorVerifyCloseRequest,
    WorkerUpdateRequest,
    WorkOrderCreate,
)
from backend.telemetry_generator import ALL_50_MACHINES, reconcile_legacy_simulator_data, update_telemetry_step  # noqa: E402
atexit.register(engine.dispose)

# Keep API assertions deterministic; telemetry progression has a separate test below.
app_module.start_background_stream = lambda interval_seconds=5: None
app_module.ml_pipeline.analyze_machine = lambda *args, **kwargs: {
    "anomaly_score": 0.0,
    "is_anomaly": False,
    "failure_risk_pct": 10,
    "diagnosis_summary": "Test only",
    "top_features": [],
}
app_module.app.router.on_startup.clear()
app_module.seed_50_machines()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


class DirectApi:
    """Call FastAPI route functions without opening a local network socket."""
    def request(self, method, path, json=None, headers=None):
        headers = headers or {}
        role = headers.get("X-User-Role", "")
        auth = {
            "role": "admin" if role == "manager" else role,
            "station": headers.get("X-User-Station"),
            "userId": headers.get("X-User-Id"),
        }
        try:
            with SessionLocal() as db:
                if method == "GET" and path == "/api/health":
                    return app_module.health_check(db)
                if method == "GET" and path == "/api/machines":
                    return app_module.list_machines(None, db, auth)
                if method == "GET" and path == "/api/workorders":
                    return app_module.list_work_orders(db, auth)
                if method == "POST" and path == "/api/workorders":
                    return app_module.create_work_order(WorkOrderCreate(**json), db)

                bits = path.strip("/").split("/")
                if len(bits) == 4 and bits[:2] == ["api", "machines"] and bits[3] == "resolve":
                    return app_module.resolve_machine_directly(bits[2], DirectMachineResolveRequest(**json), db, auth)
                if len(bits) == 4 and bits[:2] == ["api", "workorders"]:
                    order_id, action = bits[2], bits[3]
                    if action == "admin-assign-supervisor":
                        return app_module.admin_assign_supervisor(order_id, AdminAssignSupervisorRequest(**json), db)
                    if action == "supervisor-assign-worker":
                        return app_module.supervisor_assign_worker(order_id, SupervisorAssignWorkerRequest(**json), db, auth)
                    if action == "worker-update":
                        return app_module.worker_update_task(order_id, WorkerUpdateRequest(**json), db, auth)
                    if action == "supervisor-verify-close":
                        return app_module.supervisor_verify_and_close(order_id, SupervisorVerifyCloseRequest(**json), db, auth)
            return {"ERROR": 404, "detail": f"Unhandled test route: {method} {path}"}
        except Exception as error:
            status = getattr(error, "status_code", 500)
            return {"ERROR": status, "detail": getattr(error, "detail", str(error))}


def request(client, method, path, body=None, headers=None):
    return client.request(method, path, json=body, headers=headers or {})


admin = {"X-User-Role": "admin", "X-User-Id": "MGR01"}
supervisor = {"X-User-Role": "supervisor", "X-User-Id": "SUP_A", "X-User-Station": "A"}
worker = {"X-User-Role": "worker", "X-User-Id": "W_A_AB22", "X-User-Station": "A"}
issue_key = f"machine:M07:workflow-test:{uuid.uuid4().hex[:8]}"

def run(client):
    print("Checking backend health and setting up fixture...", flush=True)
    health = request(client, "GET", "/api/health")
    require(health.get("status") == "online", f"Backend health check failed: {health}")

    # Exercise transition classification against the database's authoritative
    # machine rows, rather than the simulator's former conflicting ID catalog.
    with SessionLocal() as db:
        db.query(MachineModel).filter(MachineModel.id == "M05").one().vibration = 7.5
        db.query(MachineModel).filter(MachineModel.id == "M37").one().power = 28
        db.query(MachineModel).filter(MachineModel.id == "M40").one().vibration = 4.2
        db.commit()
    update_telemetry_step()
    telemetry = request(client, "GET", "/api/machines", headers=admin)
    require(next(m for m in telemetry if m["id"] == "M37")["status"] == "critical",
            "Critical power readings did not escalate machine status.")
    require(next(m for m in telemetry if m["id"] == "M40")["status"] == "warning",
            "Warning sensor readings did not escalate machine status.")
    auto_orders = request(client, "GET", "/api/workorders", headers=admin)
    auto_order = next((o for o in auto_orders if o["issueKey"] == "machine:M05:threshold-fault"), None)
    require(auto_order and auto_order["status"] == "assigned_to_worker" and auto_order["assigneeId"],
            f"Critical threshold fault did not auto-assign a worker: {auto_order}")
    require(auto_order["spareParts"], f"AI dispatch did not attach a compatible in-stock spare part: {auto_order}")
    machine_3 = next(m for m in telemetry if m["id"] == "M03")
    require(machine_3["status"] == "critical" and machine_3["rupeesAtRisk"] > 0,
            f"M03 downtime risk was not reflected in status and exposure: {machine_3}")
    m03_order = next((o for o in auto_orders if o["machineId"] == "M03" and o["status"] not in ("closed", "resolved")), None)
    require(m03_order and m03_order["assigneeId"], f"M03 critical downtime was left unassigned: {m03_order}")

    for action in ("accept", "start", "resolve"):
        result = request(client, "POST", f"/api/workorders/{m03_order['id']}/worker-update",
                         {"action": action, "repair_notes": "M03 downtime incident repaired."}, worker)
        require(result.get("ok"), f"M03 downtime repair action {action} failed: {result}")
    m03_after_repair = next(m for m in request(client, "GET", "/api/machines", headers=admin) if m["id"] == "M03")
    require(m03_after_repair["status"] == "normal" and m03_after_repair["downtimeHours"] == 0 and m03_after_repair["downtimeEvents"] == 0 and m03_after_repair["rupeesAtRisk"] == 0,
            f"Repair did not clear M03's active-period downtime state and exposure: {m03_after_repair}")
    rejected_m03 = request(client, "POST", f"/api/workorders/{m03_order['id']}/supervisor-verify-close",
                           {"verified": False, "verification_notes": "Recheck downtime cause."}, supervisor)
    require(rejected_m03.get("status") == "in_progress", f"M03 verification rejection failed: {rejected_m03}")
    restored_m03 = next(m for m in request(client, "GET", "/api/machines", headers=admin) if m["id"] == "M03")
    require(restored_m03["status"] == "critical" and restored_m03["downtimeHours"] == 11 and restored_m03["downtimeEvents"] == 5,
            f"Rejected M03 repair did not restore its downtime counters: {restored_m03}")
    for action in ("start", "resolve"):
        request(client, "POST", f"/api/workorders/{m03_order['id']}/worker-update",
                {"action": action, "repair_notes": "M03 downtime cause corrected."}, worker)
    closed_m03 = request(client, "POST", f"/api/workorders/{m03_order['id']}/supervisor-verify-close",
                         {"verified": True, "verification_notes": "M03 repair verified."}, supervisor)
    require(closed_m03.get("status") == "closed", f"M03 repair was not closed: {closed_m03}")

    # Normalize only the test fixture to a known critical state.
    with SessionLocal() as db:
        machine = db.query(MachineModel).filter(MachineModel.id == "M07").one()
        machine.status = "critical"
        machine.failure_risk = 64
        machine.rupees_at_risk = 33750
        machine.temperature = 78
        machine.vibration = 7.5
        machine.power = 19
        db.commit()

    payload = {
        "issue_key": issue_key,
        "source": "machine",
        "machine_id": "M07",
        "station_id": "A",
        "title": "Workflow verification: M07 bearing fault",
        "detail": "Integration test for machine and work order state synchronization.",
        "action": "Inspect the bearing and verify safe operation.",
        "severity": "critical",
        "priority": "High",
        "specialization_required": "Mechanical Maintenance",
    }
    created = request(client, "POST", "/api/workorders", payload, admin)
    require(created.get("id"), f"Work order creation failed: {created}")
    order_id = created["id"]
    print("Checking assignment and duplicate prevention...", flush=True)

    duplicate = request(client, "POST", "/api/workorders", payload, admin)
    require(duplicate.get("id") == order_id and duplicate.get("duplicate_prevented"),
            f"Duplicate active assignment was not prevented: {duplicate}")

    assigned = request(client, "POST", f"/api/workorders/{order_id}/admin-assign-supervisor",
                       {"supervisor_id": "SUP_A", "manager_note": "Integration test"}, admin)
    require(assigned.get("ok"), f"Supervisor assignment failed: {assigned}")
    assigned = request(client, "POST", f"/api/workorders/{order_id}/supervisor-assign-worker",
                       {"worker_id": "W_A_AB22", "note": "Integration test"}, supervisor)
    require(assigned.get("ok"), f"Worker assignment failed: {assigned}")

    machines = request(client, "GET", "/api/machines", headers=admin)
    machine = next(m for m in machines if m["id"] == "M07")
    require(machine["status"] == "critical", f"M07 should start critical: {machine}")
    critical_before = sum(m["status"] == "critical" for m in machines)
    with SessionLocal() as db:
        part = next((item for item in db.query(InventoryItemModel).filter(InventoryItemModel.stock_level > 0).all()
                     if not json.loads(item.compatible_machines or "[]") or "M07" in json.loads(item.compatible_machines or "[]")), None)
        require(part is not None, "Seed inventory has no available part for the repair workflow test.")
        part_id, stock_before = part.id, part.stock_level

    for action in ("accept", "start", "resolve"):
        body = {"action": action, "repair_notes": "Bearing repaired and readings checked."}
        if action == "resolve":
            body["parts_used"] = [{"item_id": part_id, "quantity": 1}]
        result = request(client, "POST", f"/api/workorders/{order_id}/worker-update", body, worker)
        require(result.get("ok"), f"Worker action {action} failed: {result}")
    print("Checking that repair awaits verification and rejected repairs stay critical...", flush=True)

    orders = request(client, "GET", "/api/workorders", headers=admin)
    awaiting = next(o for o in orders if o["id"] == order_id)
    require(awaiting["status"] == "awaiting_verification", f"Expected verification state: {awaiting}")
    machine = next(m for m in request(client, "GET", "/api/machines", headers=admin) if m["id"] == "M07")
    require(machine["status"] == "normal" and machine["rupeesAtRisk"] == 0,
            f"Repaired readings did not immediately clear the fault state: {machine}")
    with SessionLocal() as db:
        require(db.query(InventoryItemModel).filter(InventoryItemModel.id == part_id).one().stock_level == stock_before - 1,
                "Reported part use did not decrement inventory exactly once.")
    require("consumedParts" in awaiting and awaiting["consumedParts"][0]["quantity"] == 1,
            f"Consumed part was not recorded on the work order: {awaiting}")

    rejected = request(client, "POST", f"/api/workorders/{order_id}/supervisor-verify-close",
                       {"verified": False, "verification_notes": "Needs another inspection."}, supervisor)
    require(rejected.get("status") == "in_progress", f"Rejection did not return order to work: {rejected}")
    machine = next(m for m in request(client, "GET", "/api/machines", headers=admin) if m["id"] == "M07")
    require(machine["status"] == "critical" and machine["rupeesAtRisk"] > 0,
            f"Rejected verification failed to restore the original machine fault readings: {machine}")

    for action in ("start", "resolve"):
        result = request(client, "POST", f"/api/workorders/{order_id}/worker-update",
                         {"action": action, "repair_notes": "Rework complete; readings are healthy."}, worker)
        require(result.get("ok"), f"Worker rework action {action} failed: {result}")

    closed = request(client, "POST", f"/api/workorders/{order_id}/supervisor-verify-close",
                     {"verified": True, "verification_notes": "Repair verified."}, supervisor)
    require(closed.get("status") == "closed", f"Supervisor close failed: {closed}")
    print("Checking verified machine recovery and restart persistence...", flush=True)
    machines = request(client, "GET", "/api/machines", headers=admin)
    machine = next(m for m in machines if m["id"] == "M07")
    require(machine["status"] == "normal" and machine["rupeesAtRisk"] == 0,
            f"Verified repair did not clear machine state: {machine}")
    require(machine["failureRisk"] <= 15,
            f"Verified repair still reports elevated persisted failure risk: {machine}")
    critical_after = sum(m["status"] == "critical" for m in machines)
    require(critical_after == critical_before - 1,
            f"Critical fleet count did not drop by one ({critical_before} -> {critical_after}).")

    orders = request(client, "GET", "/api/workorders", headers=admin)
    require(next(o for o in orders if o["id"] == order_id)["status"] == "closed",
            "Closed work order is missing or still active.")

    # Startup seeding must preserve an already verified repair.
    app_module.seed_50_machines()
    machine = next(m for m in request(client, "GET", "/api/machines", headers=admin) if m["id"] == "M07")
    require(machine["status"] == "normal", f"Startup seed reset verified repair: {machine}")

    # Direct resolution is persisted and closes linked assignments.
    direct_key = f"machine:M07:direct-test:{uuid.uuid4().hex[:8]}"
    direct = request(client, "POST", "/api/workorders", {**payload, "issue_key": direct_key}, admin)
    require(direct.get("id"), f"Direct-resolution work order creation failed: {direct}")
    resolved = request(client, "POST", "/api/machines/M07/resolve",
                       {"note": "Direct resolution integration test."}, supervisor)
    require(resolved.get("ok") and resolved.get("closedWorkOrders", 0) >= 1,
            f"Direct resolution did not close its assignment: {resolved}")
    orders = request(client, "GET", "/api/workorders", headers=admin)
    require(next(o for o in orders if o["id"] == direct["id"])["status"] == "closed",
            "Directly resolved assignment remains active.")

    # Distinct simultaneous submissions must not collide on timestamp-only IDs.
    ids = set()
    for machine_id in ("M01", "M02"):
        result = request(client, "POST", "/api/workorders", {
            **payload,
            "machine_id": machine_id,
            "issue_key": f"machine:{machine_id}:unique:{uuid.uuid4().hex[:8]}",
        }, admin)
        require(result.get("id"), f"Work order creation failed for {machine_id}: {result}")
        ids.add(result["id"])
    require(len(ids) == 2, f"Work order ID collision: {ids}")
    print("Checking passed through all integration assertions.", flush=True)

run(DirectApi())

# Confirm the guarded one-time reconciliation only resets untouched legacy
# simulator rows and retires the false auto alert without deleting its history.
legacy = {machine["id"]: machine for machine in ALL_50_MACHINES}
with SessionLocal() as db:
    for machine_id in ("M23", "M28"):
        machine = db.query(MachineModel).filter(MachineModel.id == machine_id).one()
        spec = legacy[machine_id]
        machine.temperature = spec["base_temp"]
        machine.temp_bearing = spec["base_temp"] - 2.5
        machine.temp_motor = spec["base_temp"] + 3.2
        machine.vibration = spec["base_vib"]
        machine.power = spec["base_power"]
        machine.baseline_json = json.dumps({"temperature": spec["base_temp"], "temp_bearing": spec["base_temp"] - 2.5, "temp_motor": spec["base_temp"] + 3.2, "vibration": spec["base_vib"], "power": spec["base_power"]})
    db.add(WorkOrderModel(
        id="WO-AI-M28-LEGACY-TEST", issue_key="machine:M28:threshold-fault", source="machine",
        machine_id="M28", station_id="C", title="Legacy false power alert", detail="test",
        action="test", severity="critical", priority="Critical", assignee_id="W_C_BE97",
        status="assigned_to_worker", timeline_json=json.dumps([{"kind": "auto_assigned"}]),
    ))
    db.commit()
reconcile_legacy_simulator_data()
with SessionLocal() as db:
    require(db.query(MachineModel).filter(MachineModel.id == "M23").one().power == 14.0,
            "Legacy baseline mismatch did not restore M23 from canonical seed values.")
    require(db.query(MachineModel).filter(MachineModel.id == "M28").one().status == "normal",
            "Legacy false alert reconciliation did not normalize M28.")
    require(db.query(WorkOrderModel).filter(WorkOrderModel.id == "WO-AI-M28-LEGACY-TEST").one().status == "cancelled",
            "Legacy false AI order was not retained as a cancelled audit record.")
print("PASS: API health, sensor escalation, automatic worker/stock dispatch, M03 downtime repair "
      "and rollback, duplicate prevention, worker repair and part consumption, supervisor "
      "rejection/rework/approval, critical risk/count updates, restart persistence, direct "
      "resolution, legacy false-alert reconciliation, and unique work-order IDs.")
engine.dispose()
_test_db_dir.cleanup()
