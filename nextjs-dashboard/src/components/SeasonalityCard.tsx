'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CloudSnow,
  Flower,
  Sun,
  CloudRain,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  stackIssuesByMonth,
  analyzeSeasonalPatterns,
  calculateSeasonReadiness,
  getUpcomingSeason,
  PreemptiveTask,
  SeasonReadiness,
  MonthlyIssueData
} from '../lib/seasonality-analysis';
import { PropertyData } from '../lib/portfolio-analytics';

interface SeasonalityCardProps {
  properties: PropertyData[];
  onScheduleTask?: (task: PreemptiveTask) => void;
  className?: string;
}

export default function SeasonalityCard({
  properties,
  onScheduleTask,
  className = ''
}: SeasonalityCardProps) {
  const [expandedTasks, setExpandedTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PreemptiveTask | null>(null);

  // Compute seasonal data
  const monthlyData = useMemo(() => stackIssuesByMonth(properties), [properties]);
  const seasonalPatterns = useMemo(() => analyzeSeasonalPatterns(monthlyData), [monthlyData]);
  const upcomingSeason = useMemo(() => getUpcomingSeason(), []);
  const readiness = useMemo(
    () => calculateSeasonReadiness(properties, upcomingSeason),
    [properties, upcomingSeason]
  );

  // Get season icon
  const getSeasonIcon = (season: string) => {
    const icons = {
      winter: <CloudSnow className="w-5 h-5" />,
      spring: <Flower className="w-5 h-5" />,
      summer: <Sun className="w-5 h-5" />,
      fall: <CloudRain className="w-5 h-5" />
    };
    return icons[season as keyof typeof icons] || <Calendar className="w-5 h-5" />;
  };

  // Get season colors
  const getSeasonColors = (season: string) => {
    const colors = {
      winter: { bg: 'from-blue-500/20 to-cyan-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      spring: { bg: 'from-green-500/20 to-emerald-500/20', text: 'text-green-400', border: 'border-green-500/30' },
      summer: { bg: 'from-orange-500/20 to-yellow-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
      fall: { bg: 'from-amber-500/20 to-red-500/20', text: 'text-amber-400', border: 'border-amber-500/30' }
    };
    return colors[season as keyof typeof colors] || colors.winter;
  };

  // Get readiness status config
  const getReadinessConfig = (status: SeasonReadiness['status']) => {
    const configs = {
      excellent: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: CheckCircle },
      good: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: CheckCircle },
      fair: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: AlertCircle },
      poor: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: AlertCircle }
    };
    return configs[status];
  };

  const readinessConfig = getReadinessConfig(readiness.status);
  const seasonColors = getSeasonColors(readiness.season);
  const ReadinessIcon = readinessConfig.icon;

  // Get last 12 months of data for chart
  const last12Months = monthlyData.slice(-12);
  const maxIssues = Math.max(...last12Months.map(d => d.total), 1);

  return (
    <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Seasonality & Preparedness</h3>
            <p className="text-sm text-white/60">Historical patterns and upcoming season readiness</p>
          </div>
        </div>
      </div>

      {/* Monthly Issue Stack Chart */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-white/80 mb-4">Issues by Month (Last 12 Months)</h4>
        <div className="space-y-2">
          {last12Months.length > 0 ? (
            last12Months.map((data, index) => {
              const criticalPercentage = (data.critical / maxIssues) * 100;
              const importantPercentage = (data.important / maxIssues) * 100;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 w-20">{data.month}</span>
                    <span className="text-white/90 font-medium">{data.total} issues</span>
                  </div>
                  <div className="flex gap-1 h-8">
                    {/* Critical Issues Bar */}
                    {data.critical > 0 && (
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-400 rounded-sm flex items-center justify-center transition-all hover:opacity-80"
                        style={{ width: `${criticalPercentage}%` }}
                        title={`${data.critical} critical`}
                      >
                        {criticalPercentage > 10 && (
                          <span className="text-xs font-medium text-white">{data.critical}</span>
                        )}
                      </div>
                    )}
                    {/* Important Issues Bar */}
                    {data.important > 0 && (
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-amber-400 rounded-sm flex items-center justify-center transition-all hover:opacity-80"
                        style={{ width: `${importantPercentage}%` }}
                        title={`${data.important} important`}
                      >
                        {importantPercentage > 10 && (
                          <span className="text-xs font-medium text-white">{data.important}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-white/60">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No historical data available yet</p>
            </div>
          )}
        </div>

        {last12Months.length > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-white/60">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-white/60">Important</span>
            </div>
          </div>
        )}
      </div>

      {/* Season Readiness Score */}
      <div className={`p-6 rounded-xl border ${readinessConfig.border} ${readinessConfig.bg} mb-6`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${seasonColors.bg} flex items-center justify-center`}>
              {getSeasonIcon(readiness.season)}
            </div>
            <div>
              <h4 className="text-lg font-bold text-white capitalize">
                {readiness.season} Readiness
              </h4>
              <p className="text-sm text-white/60">
                {readiness.daysUntil > 0 ? `${readiness.daysUntil} days until ${readiness.season}` : 'Current season'}
              </p>
            </div>
          </div>

          {/* Score Badge */}
          <div className="text-center">
            <div className={`text-4xl font-bold ${readinessConfig.color}`}>
              {readiness.score}
            </div>
            <div className="text-xs text-white/60">/ 100</div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mb-4">
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                readiness.status === 'excellent' || readiness.status === 'good'
                  ? 'bg-gradient-to-r from-green-500 to-blue-500'
                  : readiness.status === 'fair'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                  : 'bg-gradient-to-r from-red-500 to-orange-500'
              }`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <ReadinessIcon className={`w-5 h-5 ${readinessConfig.color}`} />
          <span className={`text-sm font-semibold capitalize ${readinessConfig.color}`}>
            {readiness.status} Preparedness
          </span>
        </div>
      </div>

      {/* Preemptive Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white/80">Recommended Pre-Season Tasks</h4>
          <button
            onClick={() => setExpandedTasks(!expandedTasks)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            {expandedTasks ? (
              <>
                Collapse <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View All ({readiness.tasks.length}) <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {(expandedTasks ? readiness.tasks : readiness.tasks.slice(0, 3)).map((task, index) => {
            const urgencyConfig = {
              high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
              medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
              low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
            }[task.urgency];

            const daysUntilDue = Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={task.id}
                className={`p-4 rounded-lg border ${urgencyConfig.border} ${urgencyConfig.bg} hover:bg-opacity-80 transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig.bg} ${urgencyConfig.color} border ${urgencyConfig.border}`}>
                        {task.urgency}
                      </span>
                      <span className="text-xs text-white/50 capitalize">{task.category}</span>
                    </div>
                    <h5 className="font-semibold text-white mb-1">{task.title}</h5>
                    <p className="text-sm text-white/70">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>Due in {daysUntilDue} days</span>
                  </div>

                  <button
                    onClick={() => {
                      if (onScheduleTask) {
                        onScheduleTask(task);
                      } else {
                        // Fallback: open HVAC modal or show alert
                        alert(`Schedule task: ${task.title}`);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm text-white"
                  >
                    Schedule
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!expandedTasks && readiness.tasks.length > 3 && (
          <button
            onClick={() => setExpandedTasks(true)}
            className="w-full mt-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            +{readiness.tasks.length - 3} more tasks
          </button>
        )}
      </div>

      {/* Seasonal Insights Footer */}
      {seasonalPatterns.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-start gap-2 text-xs text-white/60">
            <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Based on historical data, {readiness.season} typically sees{' '}
              {seasonalPatterns.find(p => p.season === readiness.season)?.avgCritical.toFixed(1) || '0'}{' '}
              critical issues per property on average. Stay ahead with proactive maintenance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}