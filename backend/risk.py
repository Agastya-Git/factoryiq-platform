"""Machine-specific predictive downtime exposure estimates."""

import json
import math

def estimate_rupees_at_risk(machine, status: str, thresholds: dict) -> float:
    """Estimate dynamic financial cost exposure (INR) from per-machine operating characteristics.

    Considers:
    - Station line importance / bottleneck weight (Station C Assembly > B Pressing > A Machining > D Finishing)
    - Machine power rating and operational load percentage (Throughput scales with power)
    - Live sensor stress (Vibration and temperature deviations over warning/critical limits)
    - Historical downtime accumulation
    """
    if status == "normal":
        return 0.0

    station_factors = {"A": 1400.0, "B": 1750.0, "C": 1950.0, "D": 1300.0}
    st_factor = station_factors.get(getattr(machine, "station", "A"), 1500.0)

    power = max(1.0, float(getattr(machine, "power", 15.0) or 15.0))
    p_weight = max(0.65, min(2.1, power / 15.0))
    load = min(100.0, max(0.0, float(getattr(machine, "load_pct", 75.0) or 75.0)))
    load_factor = 0.8 + (load / 250.0)

    # Compute sensor stress
    t_val = max(
        float(getattr(machine, "temperature", 50.0) or 50.0),
        float(getattr(machine, "temp_bearing", 50.0) or 50.0),
        float(getattr(machine, "temp_motor", 50.0) or 50.0)
    )
    v_val = float(getattr(machine, "vibration", 1.5) or 1.5)

    temp_warn = thresholds.get("tempWarn", 70.0)
    temp_crit = thresholds.get("tempCritical", 85.0)
    vib_warn = thresholds.get("vibWarn", 4.0)
    vib_crit = thresholds.get("vibCritical", 7.0)

    temp_stress = max(0.0, (t_val - temp_warn) / max(1.0, temp_crit - temp_warn))
    vib_stress = max(0.0, (v_val - vib_warn) / max(0.1, vib_crit - vib_warn))
    sensor_stress = min(1.8, max(temp_stress, vib_stress))

    # Downtime impact
    dt_hours = float(getattr(machine, "downtime_hours", 0.0) or 0.0)
    dt_factor = 1.0 + min(dt_hours, 10.0) * 0.03

    if status == "critical":
        health = float(getattr(machine, "health_score", 45.0) or 45.0)
        severity = 1.0 + sensor_stress * 0.45 + (1.0 - (health / 100.0)) * 0.5
        base_estimate = 31500.0 * p_weight * (st_factor / 1500.0) * load_factor * dt_factor * severity
        return float(round(max(24000.0, min(65000.0, base_estimate)) / 50.0) * 50.0)
    else: # warning
        severity = 1.0 + sensor_stress * 0.25
        base_estimate = 13200.0 * p_weight * (st_factor / 1500.0) * load_factor * dt_factor * severity
        return float(round(max(9000.0, min(23000.0, base_estimate)) / 50.0) * 50.0)
