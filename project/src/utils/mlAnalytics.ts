import type { Machine, MachineMLInsights, ShapContribution } from '@/types';

export function computeMLInsights(m: Machine): MachineMLInsights {
  const { temperature, vibration, power, downtimeEvents, downtimeHours, thresholds } = m;

  const tempRatio = Math.max(0, (temperature - thresholds.tempWarn) / (thresholds.tempCritical - thresholds.tempWarn));
  const vibRatio = Math.max(0, (vibration - thresholds.vibWarn) / (thresholds.vibCritical - thresholds.vibWarn));
  const powerRatio = Math.max(0, (power - thresholds.powerWarn) / (thresholds.powerCritical - thresholds.powerWarn));
  const downtimeRatio = Math.min(1.5, (downtimeEvents / 5) * 0.7 + (downtimeHours / 10) * 0.3);

  const basePrior = 12.0;
  const vibImpact = Math.min(vibRatio * 42, 45);
  const tempImpact = Math.min(tempRatio * 28, 30);
  const powerImpact = Math.min(powerRatio * 18, 20);
  const downtimeImpact = Math.min(downtimeRatio * 20, 25);

  let rawProb = basePrior + vibImpact + tempImpact + powerImpact + downtimeImpact;
  if (m.status === 'normal' && rawProb > 35) rawProb = 18.5;
  const failureProbability = Math.min(94.8, Math.max(5.2, Math.round(rawProb * 10) / 10));

  const multiDimensionalDist = Math.sqrt(
    Math.pow(vibRatio * 1.4, 2) + Math.pow(tempRatio * 1.1, 2) + Math.pow(powerRatio * 0.8, 2)
  );
  const anomalyScore = Math.min(0.96, Math.max(0.08, Math.round((multiDimensionalDist / 1.8) * 100) / 100));
  const driftLevel: 'Low' | 'Moderate' | 'Severe' =
    anomalyScore >= 0.7 ? 'Severe' : anomalyScore >= 0.4 ? 'Moderate' : 'Low';

  let rulHours = 720;
  if (failureProbability > 70) {
    rulHours = Math.max(18, Math.round(180 * (1 - failureProbability / 100)));
  } else if (failureProbability > 40) {
    rulHours = Math.round(480 * (1 - failureProbability / 100));
  }

  const shapWaterfall: ShapContribution[] = [
    {
      feature: 'vibration',
      label: 'Radial Vibration',
      impact: Math.round(vibImpact * 10) / 10,
      value: `${vibration} mm/s (warn: ${thresholds.vibWarn})`,
    },
    {
      feature: 'temperature',
      label: 'Bearing Temperature',
      impact: Math.round(tempImpact * 10) / 10,
      value: `${temperature}°C (warn: ${thresholds.tempWarn})`,
    },
    {
      feature: 'power',
      label: 'Electrical Power Draw',
      impact: Math.round(powerImpact * 10) / 10,
      value: `${power} kW (warn: ${thresholds.powerWarn})`,
    },
    {
      feature: 'downtime',
      label: 'Stoppage History',
      impact: Math.round(downtimeImpact * 10) / 10,
      value: `${downtimeEvents} events / ${downtimeHours} hrs`,
    },
  ].sort((a, b) => b.impact - a.impact);

  let primaryDiagnosis = 'Normal machine operating telemetry within safety envelope.';
  let decisionRule = 'IF all_sensors < warn_thresholds THEN status = Nominal';

  if (vibration >= thresholds.vibWarn && temperature >= thresholds.tempWarn) {
    primaryDiagnosis = 'High mechanical friction & bearing cage wear detected by tree split #4.';
    decisionRule = `IF Vibration (${vibration} > ${thresholds.vibWarn}) AND Temp (${temperature} > ${thresholds.tempWarn}) → High Bearing Seizure Risk`;
  } else if (vibration >= thresholds.vibWarn) {
    primaryDiagnosis = 'Unbalanced rotor or drive-shaft misalignment anomaly detected.';
    decisionRule = `IF Vibration (${vibration} > ${thresholds.vibWarn}) → Mechanical Fatigue Alert`;
  } else if (temperature >= thresholds.tempWarn) {
    primaryDiagnosis = 'Cooling degradation or thermal dissipation failure.';
    decisionRule = `IF Temp (${temperature} > ${thresholds.tempWarn}) → Thermal Warning`;
  } else if (downtimeEvents >= 4) {
    primaryDiagnosis = 'Intermittent electrical micro-trips or pneumatic jamming.';
    decisionRule = `IF Stoppages (${downtimeEvents} >= 4) → High Reliability Degrade`;
  }

  return {
    failureProbability,
    anomalyScore,
    driftLevel,
    rulHours,
    shapWaterfall,
    primaryDiagnosis,
    decisionRule,
  };
}
