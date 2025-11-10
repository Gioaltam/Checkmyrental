/**
 * Next Best Actions Analysis
 * Analyzes open issues and computes recommended actions by fastest payback
 */

import { CostAssumptions, getCostPerCriticalIssue, getAnnualEnergyInefficiencyCost } from './savings-model';
import { PropertyData, ReportData } from './portfolio-analytics';

export interface ActionRecommendation {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  actionType: 'emergency_repair' | 'energy_efficiency' | 'preventive_maintenance' | 'equipment_upgrade';
  title: string;
  description: string;
  estimatedCost: number;
  annualSavings: number;
  paybackMonths: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  issueCount?: number;
  reportId?: string;
  reportDate?: string;
}

/**
 * Calculate payback period in months
 */
function calculatePayback(cost: number, annualSavings: number): number {
  if (annualSavings <= 0) return 999; // No savings = infinite payback
  return (cost / annualSavings) * 12;
}

/**
 * Generate action recommendations from critical issues
 */
function generateCriticalIssueActions(
  properties: PropertyData[],
  assumptions: CostAssumptions
): ActionRecommendation[] {
  const actions: ActionRecommendation[] = [];
  const emergencyRepairCost = (assumptions.emergencyRepairCostMin + assumptions.emergencyRepairCostMax) / 2;
  const fullIssueCost = getCostPerCriticalIssue(assumptions);

  properties.forEach(property => {
    // Find the latest report with critical issues
    const reportsWithCritical = property.reports
      .filter(r => r.criticalIssues > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (reportsWithCritical.length > 0) {
      const latestReport = reportsWithCritical[0];
      const criticalCount = latestReport.criticalIssues;

      // Estimate that addressing critical issues proactively costs 60% of emergency repair
      const proactiveCost = emergencyRepairCost * 0.6 * criticalCount;

      // Savings = avoiding emergency repair + downtime costs
      const annualSavings = fullIssueCost * criticalCount * (assumptions.preventionRateCritical / 100);

      actions.push({
        id: `critical-${property.id}-${latestReport.id}`,
        propertyId: property.id,
        propertyName: property.name,
        propertyAddress: property.address,
        actionType: 'emergency_repair',
        title: `Address ${criticalCount} Critical Issue${criticalCount > 1 ? 's' : ''}`,
        description: `Proactively resolve critical issues before they escalate to emergencies`,
        estimatedCost: proactiveCost,
        annualSavings: annualSavings,
        paybackMonths: calculatePayback(proactiveCost, annualSavings),
        priority: 'critical',
        issueCount: criticalCount,
        reportId: latestReport.id,
        reportDate: latestReport.date
      });
    }
  });

  return actions;
}

/**
 * Generate action recommendations from important issues
 */
function generateImportantIssueActions(
  properties: PropertyData[],
  assumptions: CostAssumptions
): ActionRecommendation[] {
  const actions: ActionRecommendation[] = [];

  properties.forEach(property => {
    // Find reports with important issues but no critical issues
    const reportsWithImportant = property.reports
      .filter(r => r.importantIssues > 0 && r.criticalIssues === 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (reportsWithImportant.length > 0) {
      const latestReport = reportsWithImportant[0];
      const importantCount = latestReport.importantIssues;

      // Important issues cost about 50% of critical issues
      const maintenanceCost = assumptions.annualMaintenanceCost * 0.3 * importantCount;

      // Preventing escalation saves future emergency costs
      const annualSavings = getCostPerCriticalIssue(assumptions) *
                           importantCount *
                           (assumptions.preventionRateImportant / 100) *
                           0.4; // 40% chance important becomes critical

      actions.push({
        id: `important-${property.id}-${latestReport.id}`,
        propertyId: property.id,
        propertyName: property.name,
        propertyAddress: property.address,
        actionType: 'preventive_maintenance',
        title: `Preventive Maintenance for ${importantCount} Issue${importantCount > 1 ? 's' : ''}`,
        description: `Address important issues before they become critical problems`,
        estimatedCost: maintenanceCost,
        annualSavings: annualSavings,
        paybackMonths: calculatePayback(maintenanceCost, annualSavings),
        priority: 'high',
        issueCount: importantCount,
        reportId: latestReport.id,
        reportDate: latestReport.date
      });
    }
  });

  return actions;
}

/**
 * Generate energy efficiency upgrade recommendations
 */
function generateEnergyEfficiencyActions(
  properties: PropertyData[],
  assumptions: CostAssumptions
): ActionRecommendation[] {
  const actions: ActionRecommendation[] = [];
  const annualInefficiencyCost = getAnnualEnergyInefficiencyCost(assumptions);

  properties.forEach(property => {
    // Only recommend for properties with recent inspections
    if (property.reports.length === 0) return;

    const hasRecentInspection = property.reports.some(r => {
      const reportDate = new Date(r.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return reportDate >= threeMonthsAgo;
    });

    if (hasRecentInspection) {
      // Estimate HVAC efficiency upgrade cost
      const upgradeCost = assumptions.equipmentReplacementCost * 0.4; // 40% of replacement cost

      // Annual savings from improved efficiency
      const annualSavings = annualInefficiencyCost * 0.5; // Recover 50% of inefficiency

      const payback = calculatePayback(upgradeCost, annualSavings);

      // Only recommend if payback is under 5 years (60 months)
      if (payback <= 60) {
        actions.push({
          id: `energy-${property.id}`,
          propertyId: property.id,
          propertyName: property.name,
          propertyAddress: property.address,
          actionType: 'energy_efficiency',
          title: `HVAC Efficiency Upgrade`,
          description: `Upgrade to high-efficiency HVAC system to reduce energy costs`,
          estimatedCost: upgradeCost,
          annualSavings: annualSavings,
          paybackMonths: payback,
          priority: 'medium',
          reportId: property.reports[0].id,
          reportDate: property.reports[0].date
        });
      }
    }
  });

  return actions;
}

/**
 * Generate equipment replacement recommendations
 */
function generateEquipmentUpgradeActions(
  properties: PropertyData[],
  assumptions: CostAssumptions
): ActionRecommendation[] {
  const actions: ActionRecommendation[] = [];

  properties.forEach(property => {
    // Properties with recurring issues suggest equipment at end of life
    const recentReports = property.reports
      .filter(r => {
        const reportDate = new Date(r.date);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return reportDate >= sixMonthsAgo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If multiple reports in last 6 months with issues, equipment may need replacement
    const issueCount = recentReports.reduce((sum, r) => sum + r.criticalIssues + r.importantIssues, 0);

    if (recentReports.length >= 2 && issueCount >= 3) {
      const replacementCost = assumptions.equipmentReplacementCost;

      // Savings from avoiding repeated repairs + improved efficiency
      const annualRepairSavings = assumptions.annualMaintenanceCost * 1.5; // 50% reduction
      const annualEnergySavings = getAnnualEnergyInefficiencyCost(assumptions) * 0.3; // 30% improvement
      const annualSavings = annualRepairSavings + annualEnergySavings;

      const payback = calculatePayback(replacementCost, annualSavings);

      // Only recommend if payback is under 7 years (84 months)
      if (payback <= 84) {
        actions.push({
          id: `upgrade-${property.id}`,
          propertyId: property.id,
          propertyName: property.name,
          propertyAddress: property.address,
          actionType: 'equipment_upgrade',
          title: `HVAC System Replacement`,
          description: `Replace aging equipment with modern, efficient system`,
          estimatedCost: replacementCost,
          annualSavings: annualSavings,
          paybackMonths: payback,
          priority: issueCount >= 5 ? 'high' : 'medium',
          issueCount: issueCount,
          reportId: recentReports[0].id,
          reportDate: recentReports[0].date
        });
      }
    }
  });

  return actions;
}

/**
 * Main function to compute next best actions
 * Returns top N actions sorted by fastest payback
 */
export function computeNextBestActions(
  properties: PropertyData[],
  assumptions: CostAssumptions,
  limit: number = 5
): ActionRecommendation[] {
  const allActions: ActionRecommendation[] = [
    ...generateCriticalIssueActions(properties, assumptions),
    ...generateImportantIssueActions(properties, assumptions),
    ...generateEnergyEfficiencyActions(properties, assumptions),
    ...generateEquipmentUpgradeActions(properties, assumptions)
  ];

  // Sort by payback period (fastest first), then by priority
  const priorityWeight = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  allActions.sort((a, b) => {
    // First sort by payback
    if (Math.abs(a.paybackMonths - b.paybackMonths) > 0.5) {
      return a.paybackMonths - b.paybackMonths;
    }
    // Then by priority if payback is similar
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  });

  // Return top N actions
  return allActions.slice(0, limit);
}

/**
 * Get action type icon and color
 */
export function getActionTypeConfig(actionType: ActionRecommendation['actionType']): {
  icon: string;
  color: string;
  bgColor: string;
} {
  const configs = {
    emergency_repair: {
      icon: '🚨',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    preventive_maintenance: {
      icon: '🔧',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    energy_efficiency: {
      icon: '⚡',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    equipment_upgrade: {
      icon: '🔄',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    }
  };

  return configs[actionType];
}