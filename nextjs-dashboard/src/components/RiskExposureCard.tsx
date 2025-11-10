'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Shield,
  TrendingDown,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { CostAssumptions, loadAssumptions, getCostPerCriticalIssue } from '../lib/savings-model';
import { PropertyData, formatCurrency } from '../lib/portfolio-analytics';

interface RiskExposureCardProps {
  properties: PropertyData[];
  onFixTop3: () => void;
  className?: string;
}

interface RiskItem {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  severity: 'critical' | 'important';
  issueCount: number;
  probability: number;
  emergencyPremium: number;
  riskExposure: number;
}

export default function RiskExposureCard({
  properties,
  onFixTop3,
  className = ''
}: RiskExposureCardProps) {
  const [assumptions, setAssumptions] = useState<CostAssumptions | null>(null);
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);

  // Load assumptions
  useEffect(() => {
    const loaded = loadAssumptions();
    setAssumptions(loaded);
  }, []);

  // Calculate risk exposure
  useEffect(() => {
    if (!assumptions) return;

    const items: RiskItem[] = [];
    const costPerCritical = getCostPerCriticalIssue(assumptions);
    const costPerImportant = costPerCritical * 0.5; // Important costs ~50% of critical

    properties.forEach(property => {
      // Get latest report with issues
      const latestReport = property.reports
        .filter(r => r.criticalIssues > 0 || r.importantIssues > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (latestReport) {
        // Critical issues
        if (latestReport.criticalIssues > 0) {
          const probability = 0.75; // 75% chance critical issue escalates to emergency
          const emergencyPremium = costPerCritical;
          const riskExposure = probability * emergencyPremium * latestReport.criticalIssues;

          items.push({
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            severity: 'critical',
            issueCount: latestReport.criticalIssues,
            probability: probability,
            emergencyPremium: emergencyPremium,
            riskExposure: riskExposure
          });
        }

        // Important issues
        if (latestReport.importantIssues > 0) {
          const probability = 0.35; // 35% chance important issue escalates
          const emergencyPremium = costPerImportant;
          const riskExposure = probability * emergencyPremium * latestReport.importantIssues;

          items.push({
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            severity: 'important',
            issueCount: latestReport.importantIssues,
            probability: probability,
            emergencyPremium: emergencyPremium,
            riskExposure: riskExposure
          });
        }
      }
    });

    // Sort by highest risk exposure
    items.sort((a, b) => b.riskExposure - a.riskExposure);
    setRiskItems(items);
  }, [properties, assumptions]);

  if (!assumptions || riskItems.length === 0) {
    return (
      <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Risk Exposure</h3>
            <p className="text-sm text-white/60">Portfolio risk analysis</p>
          </div>
        </div>
        <div className="text-center py-8 text-white/60">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No open issues detected. Your portfolio is in good shape!</p>
        </div>
      </div>
    );
  }

  // Calculate total portfolio exposure
  const totalExposure = riskItems.reduce((sum, item) => sum + item.riskExposure, 0);

  // Get top 3 highest risk items
  const top3Items = riskItems.slice(0, 3);
  const top3Exposure = top3Items.reduce((sum, item) => sum + item.riskExposure, 0);

  // Calculate critical vs important breakdown
  const criticalExposure = riskItems
    .filter(item => item.severity === 'critical')
    .reduce((sum, item) => sum + item.riskExposure, 0);
  const importantExposure = riskItems
    .filter(item => item.severity === 'important')
    .reduce((sum, item) => sum + item.riskExposure, 0);

  const criticalPercentage = totalExposure > 0 ? (criticalExposure / totalExposure) * 100 : 0;
  const importantPercentage = totalExposure > 0 ? (importantExposure / totalExposure) * 100 : 0;

  return (
    <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Risk Exposure</h3>
            <p className="text-sm text-white/60">Estimated portfolio risk from open issues</p>
          </div>
        </div>

        {/* Total Exposure Badge */}
        <div className="text-right">
          <div className="text-sm text-white/60 mb-1">Total Exposure</div>
          <div className="text-3xl font-bold text-red-400">
            {formatCurrency(totalExposure)}
          </div>
        </div>
      </div>

      {/* Risk Breakdown Visualization */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">Risk Distribution</span>
          <span className="text-xs text-white/50">{riskItems.length} risk factors identified</span>
        </div>

        {/* Stacked Bar */}
        <div className="h-8 bg-white/10 rounded-lg overflow-hidden flex">
          {/* Critical Section */}
          {criticalPercentage > 0 && (
            <div
              className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center"
              style={{ width: `${criticalPercentage}%` }}
              title={`Critical: ${formatCurrency(criticalExposure)}`}
            >
              {criticalPercentage > 15 && (
                <span className="text-xs font-medium text-white">
                  {criticalPercentage.toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {/* Important Section */}
          {importantPercentage > 0 && (
            <div
              className="bg-gradient-to-r from-yellow-500 to-amber-400 flex items-center justify-center"
              style={{ width: `${importantPercentage}%` }}
              title={`Important: ${formatCurrency(importantExposure)}`}
            >
              {importantPercentage > 15 && (
                <span className="text-xs font-medium text-white">
                  {importantPercentage.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-white/60">Critical ({formatCurrency(criticalExposure)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-white/60">Important ({formatCurrency(importantExposure)})</span>
          </div>
        </div>
      </div>

      {/* Top Risk Items */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white/80 mb-3">Highest Risk Properties</h4>
        <div className="space-y-2">
          {top3Items.map((item, index) => (
            <div
              key={`${item.propertyId}-${item.severity}`}
              className={`p-4 rounded-lg border ${
                item.severity === 'critical'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white/50">#{index + 1}</span>
                    <span className="font-medium text-white">{item.propertyName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.severity === 'critical'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.issueCount} {item.severity} {item.issueCount > 1 ? 'issues' : 'issue'}
                    </span>
                  </div>
                  <div className="text-xs text-white/60">
                    {(item.probability * 100).toFixed(0)}% escalation probability × {formatCurrency(item.emergencyPremium)} emergency cost
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${
                    item.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {formatCurrency(item.riskExposure)}
                  </div>
                  <div className="text-xs text-white/50">exposure</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="p-5 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-green-400" />
              <h4 className="font-semibold text-white">Reduce Your Risk</h4>
            </div>
            <p className="text-sm text-white/80 mb-3">
              Addressing the top 3 highest-risk issues can reduce your portfolio exposure by{' '}
              <span className="font-bold text-green-400">{formatCurrency(top3Exposure)}</span>
            </p>
            <div className="text-xs text-white/60">
              That's {((top3Exposure / totalExposure) * 100).toFixed(0)}% of your total risk eliminated through proactive maintenance
            </div>
          </div>
          <button
            onClick={onFixTop3}
            className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
          >
            Fix Top 3
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-start gap-2 text-xs text-white/60">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Risk exposure represents the expected cost if current issues escalate to emergencies.
            Calculation: Σ(escalation probability × emergency repair premium) across all open issues.
          </p>
        </div>
      </div>
    </div>
  );
}