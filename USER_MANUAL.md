# FactoryIQ — Quick User Manual

Welcome to **FactoryIQ**, a smart monitoring and repair platform for factory machinery.

---

## 1. How to Start the App

1. **Double-click** `start_factoryiq.bat` (on Windows) or run `start_factoryiq.sh` (on Mac/Linux).
2. Your browser will automatically open at `http://localhost:5173`.
3. That's it! Everything (machines, workers, tasks, spare parts) is already loaded.

---

## 2. Who Can Log In? (3 Roles)

| Role | Username | Password | What They Do |
| :--- | :--- | :--- | :--- |
| **Factory Admin** | `admin` | `Admin#Factory99` | Sees the entire factory (all 50 machines, plant revenue, all spare parts). |
| **Station Supervisor** | `supervisor.b` | `Pressing@StnB2` | Manages one line (Station B). Assigns tasks to their workers and approves completed repairs. |
| **Maintenance Worker** | `manoj.b` | `Manoj@501` | Receives tasks, views safety steps, and marks repairs finished. |

*(Other station supervisors: `supervisor.a` / `Machining@StnA1`, `supervisor.c` / `Assembly@StnC3`, `supervisor.d` / `Finishing@StnD4`)*

---

## 3. How the Whole System Works (5 Steps)

```
1. Machine Alert  ──>  2. AI Auto-Assign  ──>  3. Stock Check  ──>  4. Worker Fixes It  ──>  5. Supervisor Sign-off
```

### Step 1: A Machine Detects an Issue
* The factory has 50 machines across 4 stations (A, B, C, D).
* When a machine overheats or shakes abnormally, it turns **Red (Critical)** or **Yellow (Warning)** and shows the exact money bleeding per hour in Rupees.
* A repair work order is automatically created.

### Step 2: Auto-Assign Pairs the Best Worker
* When you click **⚡ Auto-Assign (AI)** or **⚡ Smart Queue Dispatch**:
  * The system finds an available worker in that station.
  * It matches the worker's skill (e.g., Mechanical fault $\rightarrow$ Mechanical technician).
  * It avoids overloading busy workers.

### Step 3: Smart Spare Parts Check (Safety Guard)
* Before sending a worker, the system checks if the required replacement part is in stock.
* **If parts are in stock:** The worker is assigned and given the exact warehouse shelf location (e.g., `Bin B-03`).
* **If parts are OUT OF STOCK (0 units):** The system will **NOT** send a worker to an unfixable machine. It places the task on **Blocked (Hold)** and keeps the worker free for other machines.
* **When restocked:** Once you add stock in the Inventory tab, the blocked task **automatically unblocks and dispatches**.

### Step 4: Worker Executes the Repair
* When the assigned worker logs in (e.g., `manoj.b`):
  * They see the exact part to pick up and Lockout/Tagout safety rules.
  * They click **Accept Task**, then **Start Repair**, replace the part, and click **Mark Resolved**.

### Step 5: Supervisor Verifies and Closes
* The supervisor checks the machine, clicks **Verify & Close**.
* The machine immediately turns **Green (Normal)**, and temperature/vibration drop back to healthy levels!

---

## 4. Key Actions You Can Try

1. **Test Auto-Dispatch:** Go to **Work Orders**, find any pending order, and click **⚡ Auto-Assign (AI)**.
2. **Test Unassign Worker:** On any assigned order, click **Unassign** to free the worker and return the order to the queue.
3. **Test Inventory Restock:** Go to **Station Spares / Central Inventory**, find a low-stock part, and click **+ Restock**.
4. **Test Worker Management:** Go to **Lines & Teams**, where you can toggle worker availability or click **Unregister** to remove a worker.
