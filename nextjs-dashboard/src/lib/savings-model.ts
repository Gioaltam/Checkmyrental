/**
 * Savings Model - Cost Assumptions and Presets
 * Handles editable cost assumptions for calculating potential savings
 */

export interface CostAssumptions {
  // Emergency Repair Costs (per incident)
  emergencyRepairCostMin: number;
  emergencyRepairCostMax: number;
  emergencyCalloutFee: number;

  // Energy Efficiency
  annualEnergySpend: number;
  energyInefficiencyPercentage: number; // % of energy spend that could be saved

  // Downtime Costs (per day)
  downtimeCostPerDay: number;
  avgDowntimeDaysPerIssue: number;

  // Capital Deferral
  equipmentReplacementCost: number;
  annualMaintenanceCost: number;
  lifeExtensionYears: number; // Years added to equipment life with proper maintenance

  // Issue Prevention Rates
  preventionRateCritical: number; // % of critical issues that could be prevented
  preventionRateImportant: number; // % of important issues that could be prevented

  // Scenario name
  scenarioName?: string;
}

// Preset scenarios
export const COST_ASSUMPTION_PRESETS: Record<string, CostAssumptions> = {
  conservative: {
    emergencyRepairCostMin: 500,
    emergencyRepairCostMax: 2000,
    emergencyCalloutFee: 150,
    annualEnergySpend: 24000, // $2k/month average
    energyInefficiencyPercentage: 10,
    downtimeCostPerDay: 200,
    avgDowntimeDaysPerIssue: 2,
    equipmentReplacementCost: 8000,
    annualMaintenanceCost: 1200,
    lifeExtensionYears: 3,
    preventionRateCritical: 40,
    preventionRateImportant: 30,
    scenarioName: 'Conservative'
  },
  likely: {
    emergencyRepairCostMin: 800,
    emergencyRepairCostMax: 3500,
    emergencyCalloutFee: 250,
    annualEnergySpend: 36000, // $3k/month average
    energyInefficiencyPercentage: 15,
    downtimeCostPerDay: 500,
    avgDowntimeDaysPerIssue: 3,
    equipmentReplacementCost: 12000,
    annualMaintenanceCost: 1800,
    lifeExtensionYears: 5,
    preventionRateCritical: 60,
    preventionRateImportant: 50,
    scenarioName: 'Likely'
  },
  aggressive: {
    emergencyRepairCostMin: 1200,
    emergencyRepairCostMax: 5000,
    emergencyCalloutFee: 350,
    annualEnergySpend: 48000, // $4k/month average
    energyInefficiencyPercentage: 25,
    downtimeCostPerDay: 1000,
    avgDowntimeDaysPerIssue: 4,
    equipmentReplacementCost: 15000,
    annualMaintenanceCost: 2400,
    lifeExtensionYears: 7,
    preventionRateCritical: 75,
    preventionRateImportant: 65,
    scenarioName: 'Aggressive'
  }
};

// Default to likely scenario
export const DEFAULT_ASSUMPTIONS = COST_ASSUMPTION_PRESETS.likely;

/**
 * Persist assumptions to localStorage
 */
export function saveAssumptions(assumptions: CostAssumptions): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('savingsAssumptions', JSON.stringify(assumptions));
  }
}

/**
 * Load assumptions from localStorage
 */
export function loadAssumptions(): CostAssumptions {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('savingsAssumptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved assumptions:', e);
      }
    }
  }
  return DEFAULT_ASSUMPTIONS;
}

/**
 * Calculate average emergency repair cost
 */
export function getAverageEmergencyRepairCost(assumptions: CostAssumptions): number {
  return (assumptions.emergencyRepairCostMin + assumptions.emergencyRepairCostMax) / 2 +
         assumptions.emergencyCalloutFee;
}

/**
 * Calculate annual energy inefficiency cost
 */
export function getAnnualEnergyInefficiencyCost(assumptions: CostAssumptions): number {
  return assumptions.annualEnergySpend * (assumptions.energyInefficiencyPercentage / 100);
}

/**
 * Calculate cost per critical issue (including downtime)
 */
export function getCostPerCriticalIssue(assumptions: CostAssumptions): number {
  const repairCost = getAverageEmergencyRepairCost(assumptions);
  const downtimeCost = assumptions.downtimeCostPerDay * assumptions.avgDowntimeDaysPerIssue;
  return repairCost + downtimeCost;
}

/**
 * Calculate annual capital deferral savings
 */
export function getAnnualCapitalDeferralSavings(assumptions: CostAssumptions): number {
  const annualDepreciation = assumptions.equipmentReplacementCost / assumptions.lifeExtensionYears;
  const maintenanceSavings = assumptions.annualMaintenanceCost * 0.3; // Assume 30% reduction in maintenance costs
  return annualDepreciation - maintenanceSavings;
}