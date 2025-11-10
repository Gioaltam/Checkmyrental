'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronRight,
  Clock,
  Zap
} from 'lucide-react';
import {
  computeNextBestActions,
  ActionRecommendation,
  getActionTypeConfig
} from '../lib/next-best-actions';
import { CostAssumptions, loadAssumptions } from '../lib/savings-model';
import { PropertyData, formatCurrency } from '../lib/portfolio-analytics';

interface NextBestActionsProps {
  properties: PropertyData[];
  onScheduleAction: (propertyId: string, propertyName: string, actionDescription: string) => void;
  className?: string;
}

export default function NextBestActions({
  properties,
  onScheduleAction,
  className = ''
}: NextBestActionsProps) {
  const [assumptions, setAssumptions] = useState<CostAssumptions | null>(null);
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Load assumptions and compute actions
  useEffect(() => {
    const loaded = loadAssumptions();
    setAssumptions(loaded);
  }, []);

  useEffect(() => {
    if (assumptions) {
      const computed = computeNextBestActions(properties, assumptions, 5);
      setActions(computed);
    }
  }, [properties, assumptions]);

  if (!assumptions || actions.length === 0) {
    return (
      <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-green-400" />
          Next Best Actions
        </h3>
        <div className="text-center py-8 text-white/60">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No action recommendations available at this time.</p>
          <p className="text-sm mt-2">Complete property inspections to receive personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-green-400" />
          Next Best Actions
        </h3>
        <p className="text-white/60 text-sm">
          Top {actions.length} recommended actions ranked by fastest payback period
        </p>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {actions.map((action, index) => {
          const config = getActionTypeConfig(action.actionType);
          const isExpanded = expandedAction === action.id;

          return (
            <div
              key={action.id}
              className={`border border-white/10 rounded-lg overflow-hidden transition-all ${
                isExpanded ? 'bg-white/5' : 'bg-white/[0.02] hover:bg-white/5'
              }`}
            >
              {/* Action Summary */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">#{index + 1}</span>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg ${config.color}`}>{config.icon}</span>
                          <h4 className="text-base font-semibold text-white">
                            {action.title}
                          </h4>
                          {action.priority === 'critical' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/60">{action.propertyName}</p>
                      </div>

                      {/* Payback Badge */}
                      <div className="flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">
                            {action.paybackMonths.toFixed(1)} mo
                          </div>
                          <div className="text-xs text-white/50">payback</div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Estimated Cost */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-white/40" />
                        <div>
                          <div className="text-xs text-white/50">Est. Cost</div>
                          <div className="text-sm font-medium text-white">
                            {formatCurrency(action.estimatedCost)}
                          </div>
                        </div>
                      </div>

                      {/* Annual Savings */}
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-400/60" />
                        <div>
                          <div className="text-xs text-white/50">Annual Savings</div>
                          <div className="text-sm font-medium text-green-400">
                            {formatCurrency(action.annualSavings)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          onScheduleAction(
                            action.propertyId,
                            action.propertyName,
                            action.description
                          )
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-sm font-medium border border-green-500/30 hover:border-green-500/50"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>

                      <button
                        onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-all text-sm"
                      >
                        {isExpanded ? 'Less' : 'Details'}
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="space-y-3">
                      {/* Description */}
                      <div>
                        <h5 className="text-xs font-semibold text-white/70 uppercase mb-1">
                          Description
                        </h5>
                        <p className="text-sm text-white/80">{action.description}</p>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`${config.bgColor} p-3 rounded-lg`}>
                          <div className="text-xs text-white/60 mb-1">Investment Required</div>
                          <div className="text-lg font-semibold text-white">
                            {formatCurrency(action.estimatedCost)}
                          </div>
                        </div>

                        <div className="bg-green-500/10 p-3 rounded-lg">
                          <div className="text-xs text-white/60 mb-1">Year 1 Savings</div>
                          <div className="text-lg font-semibold text-green-400">
                            {formatCurrency(action.annualSavings)}
                          </div>
                        </div>

                        <div className="bg-blue-500/10 p-3 rounded-lg">
                          <div className="text-xs text-white/60 mb-1">Break Even</div>
                          <div className="text-lg font-semibold text-blue-400">
                            {action.paybackMonths.toFixed(1)} months
                          </div>
                        </div>
                      </div>

                      {/* ROI Visualization */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/60">Return on Investment</span>
                          <span className="text-xs font-medium text-white">
                            {((action.annualSavings / action.estimatedCost) * 100).toFixed(0)}% annual ROI
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                ((action.annualSavings / action.estimatedCost) * 100),
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      {action.issueCount && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Based on {action.issueCount} issue{action.issueCount > 1 ? 's' : ''} identified
                            {action.reportDate && (
                              <> on {new Date(action.reportDate).toLocaleDateString()}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/60">
            Total potential first-year savings:
          </div>
          <div className="text-xl font-bold text-green-400">
            {formatCurrency(actions.reduce((sum, action) => sum + action.annualSavings, 0))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-white/60">
            Total investment required:
          </div>
          <div className="text-lg font-semibold text-white">
            {formatCurrency(actions.reduce((sum, action) => sum + action.estimatedCost, 0))}
          </div>
        </div>
        <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-white/80">
              Average payback period:{' '}
              <span className="font-semibold text-green-400">
                {(
                  actions.reduce((sum, action) => sum + action.paybackMonths, 0) /
                  actions.length
                ).toFixed(1)}{' '}
                months
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}