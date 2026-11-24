export interface OEEBreakdown {
  availability: number;
  performance: number;
  quality: number;
  overall: number;
}

export function computeOEE(downtimeRate = 8.2): OEEBreakdown {
  const availability = Math.round((100 - downtimeRate) * 10) / 10;
  const performance = 95.2;
  const quality = 99.5;
  const overall = Math.round(((availability / 100) * (performance / 100) * (quality / 100)) * 1000) / 10;
  return { availability, performance, quality, overall };
}

export const GRID_CARBON_FACTOR_KG = 0.82;

export function energyToCarbon(kwh: number): { kgCO2: number; metricTonsCO2: number; treesEquivalent: number } {
  const kgCO2 = Math.round(kwh * GRID_CARBON_FACTOR_KG);
  const metricTonsCO2 = Math.round((kgCO2 / 1000) * 100) / 100;
  const treesEquivalent = Math.round(kgCO2 / 22);
  return { kgCO2, metricTonsCO2, treesEquivalent };
}
