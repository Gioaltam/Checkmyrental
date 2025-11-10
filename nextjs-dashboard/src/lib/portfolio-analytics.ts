/**
 * Portfolio Analytics
 * Computes YTD savings based on property data and cost assumptions
 */

import { CostAssumptions, getCostPerCriticalIssue, getAnnualEnergyInefficiencyCost, getAnnualCapitalDeferralSavings } from './savings-model';

export interface PropertyData {
  id: string;
  name: string;
  address: string;
  reports: ReportData[];
  latestReport?: ReportData;
  [key: string]: any; // Allow extra properties for compatibility
}

export interface ReportData {
  id: string;
  date: string;
  criticalIssues: number;
  importantIssues: number;
  resolvedIssues?: number;
  preventedIssues?: number;
  propertyAddress?: string; // Add optional property for tracking
  [key: string]: any; // Allow extra properties for compatibility
}

export interface SavingsBreakdown {
  avoidedEmergency: number;
  energy: number;
  downtime: number;
  capitalDeferral: number;
  total: number;
}

export interface YTDSavings {
  realized: SavingsBreakdown;
  potential: SavingsBreakdown;
  percentRealized: number;
}

/**
 * Calculate the number of days Year-to-Date
 */
function getDaysYTD(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get YTD factor (portion of year elapsed)
 */
function getYTDFactor(): number {
  return getDaysYTD() / 365;
}

/**
 * Filter reports to only include YTD
 */
function getYTDReports(reports: ReportData[]): ReportData[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return reports.filter(report => {
    const reportDate = new Date(report.date);
    return reportDate >= startOfYear && reportDate <= now;
  });
}

/**
 * Calculate avoided emergency repair savings
 */
function calculateAvoidedEmergencySavings(
  properties: PropertyData[],
  assumptions: CostAssumptions,
  isPotential: boolean = false
): number {
  let totalSavings = 0;
  const costPerIssue = getCostPerCriticalIssue(assumptions);

  properties.forEach(property => {
    const ytdReports = getYTDReports(property.reports);

    ytdReports.forEach(report => {
      if (isPotential) {
        // Potential savings from issues that could have been prevented
        const preventableCritical = report.criticalIssues * (assumptions.preventionRateCritical / 100);
        const preventableImportant = report.importantIssues * (assumptions.preventionRateImportant / 100);

        totalSavings += preventableCritical * costPerIssue;
        totalSavings += preventableImportant * (costPerIssue * 0.5); // Important issues cost ~50% of critical
      } else {
        // Realized savings from actually prevented/resolved issues
        const prevented = report.preventedIssues || 0;
        const resolved = report.resolvedIssues || 0;

        totalSavings += (prevented + resolved) * costPerIssue * 0.7; // 70% of full cost for proactive resolution
      }
    });
  });

  return totalSavings;
}

/**
 * Calculate energy efficiency savings
 */
function calculateEnergySavings(
  properties: PropertyData[],
  assumptions: CostAssumptions,
  isPotential: boolean = false
): number {
  const annualInefficiencyCost = getAnnualEnergyInefficiencyCost(assumptions);
  const ytdFactor = getYTDFactor();
  const perPropertySavings = (annualInefficiencyCost / 12) * ytdFactor; // Assume monthly billing

  if (isPotential) {
    // All properties could achieve these savings
    return perPropertySavings * properties.length;
  } else {
    // Only properties with recent inspections and improvements
    const improvedProperties = properties.filter(p => {
      const ytdReports = getYTDReports(p.reports);
      return ytdReports.length > 0 &&
             ytdReports.some(r => (r.resolvedIssues || 0) > 0);
    });

    return perPropertySavings * improvedProperties.length * 0.6; // Assume 60% efficiency gain realized
  }
}

/**
 * Calculate downtime reduction savings
 */
function calculateDowntimeSavings(
  properties: PropertyData[],
  assumptions: CostAssumptions,
  isPotential: boolean = false
): number {
  let totalSavings = 0;
  const downtimeCostPerIssue = assumptions.downtimeCostPerDay * assumptions.avgDowntimeDaysPerIssue;

  properties.forEach(property => {
    const ytdReports = getYTDReports(property.reports);

    ytdReports.forEach(report => {
      if (isPotential) {
        // Potential savings from avoiding downtime
        const avoidableDowntime = (report.criticalIssues + report.importantIssues * 0.3);
        totalSavings += avoidableDowntime * downtimeCostPerIssue;
      } else {
        // Realized savings from prevented downtime
        const preventedDowntime = (report.preventedIssues || 0) + (report.resolvedIssues || 0) * 0.5;
        totalSavings += preventedDowntime * downtimeCostPerIssue * 0.8; // 80% of potential realized
      }
    });
  });

  return totalSavings;
}

/**
 * Calculate capital deferral savings
 */
function calculateCapitalDeferralSavings(
  properties: PropertyData[],
  assumptions: CostAssumptions,
  isPotential: boolean = false
): number {
  const annualDeferralSavings = getAnnualCapitalDeferralSavings(assumptions);
  const ytdFactor = getYTDFactor();
  const perPropertySavings = annualDeferralSavings * ytdFactor;

  if (isPotential) {
    // All properties could achieve deferral savings
    return perPropertySavings * properties.length;
  } else {
    // Only properties with active maintenance
    const maintainedProperties = properties.filter(p => {
      const ytdReports = getYTDReports(p.reports);
      return ytdReports.length >= 2; // At least 2 inspections YTD indicates active maintenance
    });

    return perPropertySavings * maintainedProperties.length * 0.7; // 70% of potential realized
  }
}

/**
 * Main function to compute YTD savings
 */
export function computeYtdSavings(
  properties: PropertyData[],
  assumptions: CostAssumptions
): YTDSavings {
  // Calculate realized savings
  const realizedSavings: SavingsBreakdown = {
    avoidedEmergency: calculateAvoidedEmergencySavings(properties, assumptions, false),
    energy: calculateEnergySavings(properties, assumptions, false),
    downtime: calculateDowntimeSavings(properties, assumptions, false),
    capitalDeferral: calculateCapitalDeferralSavings(properties, assumptions, false),
    total: 0
  };
  realizedSavings.total =
    realizedSavings.avoidedEmergency +
    realizedSavings.energy +
    realizedSavings.downtime +
    realizedSavings.capitalDeferral;

  // Calculate potential savings
  const potentialSavings: SavingsBreakdown = {
    avoidedEmergency: calculateAvoidedEmergencySavings(properties, assumptions, true),
    energy: calculateEnergySavings(properties, assumptions, true),
    downtime: calculateDowntimeSavings(properties, assumptions, true),
    capitalDeferral: calculateCapitalDeferralSavings(properties, assumptions, true),
    total: 0
  };
  potentialSavings.total =
    potentialSavings.avoidedEmergency +
    potentialSavings.energy +
    potentialSavings.downtime +
    potentialSavings.capitalDeferral;

  // Calculate percent realized
  const percentRealized = potentialSavings.total > 0
    ? (realizedSavings.total / potentialSavings.total) * 100
    : 0;

  return {
    realized: realizedSavings,
    potential: potentialSavings,
    percentRealized
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get savings category color
 */
export function getSavingsCategoryColor(category: keyof SavingsBreakdown): string {
  const colors: Record<string, string> = {
    avoidedEmergency: '#ef4444', // red-500
    energy: '#10b981',          // green-500
    downtime: '#f59e0b',         // amber-500
    capitalDeferral: '#3b82f6',  // blue-500
    total: '#ffffff'
  };
  return colors[category] || '#6b7280';
}