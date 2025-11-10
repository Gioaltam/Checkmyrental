"use client";
import { useState } from "react";
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface PropertyHealth {
  id: string;
  propertyAddress: string;
  healthScore: number;
  factors: {
    age: { score: number; status: 'good' | 'fair' | 'poor' };
    maintenance: { score: number; status: 'good' | 'fair' | 'poor' };
    overdue: { score: number; status: 'good' | 'fair' | 'poor' };
  };
  trend: 'up' | 'down' | 'stable';
}

const SAMPLE_HEALTH: PropertyHealth[] = [
  {
    id: '1',
    propertyAddress: '123 Oak Street',
    healthScore: 75,
    factors: {
      age: { score: 65, status: 'fair' },
      maintenance: { score: 90, status: 'good' },
      overdue: { score: 70, status: 'fair' }
    },
    trend: 'stable'
  },
  {
    id: '2',
    propertyAddress: '456 Maple Ave',
    healthScore: 88,
    factors: {
      age: { score: 85, status: 'good' },
      maintenance: { score: 95, status: 'good' },
      overdue: { score: 85, status: 'good' }
    },
    trend: 'up'
  },
  {
    id: '3',
    propertyAddress: '789 Pine Road',
    healthScore: 45,
    factors: {
      age: { score: 50, status: 'poor' },
      maintenance: { score: 40, status: 'poor' },
      overdue: { score: 45, status: 'poor' }
    },
    trend: 'down'
  }
];

export default function EquipmentHealthScore() {
  const [properties, setProperties] = useState<PropertyHealth[]>(SAMPLE_HEALTH);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-white/60" />;
  };

  const avgScore = Math.round(properties.reduce((sum, p) => sum + p.healthScore, 0) / properties.length);

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">Equipment Health Score</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/60">Portfolio Average</div>
          <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</div>
        </div>
      </div>

      {/* Property List */}
      <div className="space-y-3 mb-5">
        {properties.map((property) => (
          <button
            key={property.id}
            onClick={() => setSelectedProperty(selectedProperty === property.id ? null : property.id)}
            className={`w-full rounded-lg p-4 border transition-all text-left ${
              selectedProperty === property.id
                ? 'bg-white/10 border-white/30'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            {/* Property Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="font-semibold text-sm text-white mb-1">
                  {property.propertyAddress}
                </div>
                <div className="text-xs text-white/60">{getScoreLabel(property.healthScore)}</div>
              </div>
              <div className="flex items-center gap-3">
                {getTrendIcon(property.trend)}
                <div className={`text-3xl font-bold ${getScoreColor(property.healthScore)}`}>
                  {property.healthScore}
                </div>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${getScoreBgColor(property.healthScore)} transition-all duration-500`}
                style={{ width: `${property.healthScore}%` }}
              />
            </div>

            {/* Expanded Details */}
            {selectedProperty === property.id && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in duration-300">
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">
                  Health Factors
                </div>

                {/* Age Factor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      property.factors.age.status === 'good'
                        ? 'bg-green-400'
                        : property.factors.age.status === 'fair'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-white/80">Equipment Age</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getScoreColor(property.factors.age.score)}`}>
                      {property.factors.age.score}%
                    </span>
                  </div>
                </div>

                {/* Maintenance Factor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      property.factors.maintenance.status === 'good'
                        ? 'bg-green-400'
                        : property.factors.maintenance.status === 'fair'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-white/80">Maintenance History</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getScoreColor(property.factors.maintenance.score)}`}>
                      {property.factors.maintenance.score}%
                    </span>
                  </div>
                </div>

                {/* Overdue Factor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      property.factors.overdue.status === 'good'
                        ? 'bg-green-400'
                        : property.factors.overdue.status === 'fair'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-white/80">Service Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getScoreColor(property.factors.overdue.score)}`}>
                      {property.factors.overdue.score}%
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                {property.healthScore < 80 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">
                      Recommendations
                    </div>
                    <div className="space-y-2">
                      {property.factors.age.status === 'poor' && (
                        <div className="text-xs text-white/70 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                          <span>Consider equipment replacement planning</span>
                        </div>
                      )}
                      {property.factors.maintenance.status === 'poor' && (
                        <div className="text-xs text-white/70 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                          <span>Schedule regular maintenance service</span>
                        </div>
                      )}
                      {property.factors.overdue.status === 'poor' && (
                        <div className="text-xs text-white/70 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                          <span>Address overdue service immediately</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/60">80+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-white/60">60-79 Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-white/60">&lt;60 Attention</span>
          </div>
        </div>
      </div>
    </div>
  );
}
