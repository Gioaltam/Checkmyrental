"use client";
import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
  latestReport?: {
    criticalIssues: number;
    importantIssues: number;
    date: string;
  };
}

interface HealthScoreWidgetProps {
  score?: number;
  criticalIssues?: number;
  importantIssues?: number;
  totalProperties?: number;
  properties?: Property[];
}

export default function HealthScoreWidget({
  score: providedScore,
  criticalIssues = 0,
  importantIssues = 0,
  totalProperties = 0,
  properties = []
}: HealthScoreWidgetProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate health score based on issues and property conditions
  const calculateScore = () => {
    if (providedScore !== undefined) return providedScore;

    // Base score is 100
    let score = 100;

    // Weight factors for different severity levels
    const CRITICAL_WEIGHT = 15;
    const IMPORTANT_WEIGHT = 5;
    const NO_INSPECTION_PENALTY = 10;

    // Deduct points for critical issues
    score -= criticalIssues * CRITICAL_WEIGHT;

    // Deduct points for important issues
    score -= importantIssues * IMPORTANT_WEIGHT;

    // Penalty for properties without recent inspections (90+ days)
    if (properties && properties.length > 0) {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const propertiesNeedingInspection = properties.filter(p => {
        if (!p.latestReport) return true;
        const reportDate = new Date(p.latestReport.date);
        return reportDate < ninetyDaysAgo;
      }).length;

      score -= propertiesNeedingInspection * NO_INSPECTION_PENALTY;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateScore();

  // Calculate trend based on historical data
  const calculateTrend = () => {
    if (!properties || properties.length === 0) return "stable";

    // Count properties by status
    const criticalCount = properties.filter(p => p.status === "critical").length;
    const okCount = properties.filter(p => p.status === "ok").length;

    // Determine trend
    if (criticalCount === 0 && okCount >= properties.length * 0.8) return "up";
    if (criticalCount > properties.length * 0.3) return "down";
    return "stable";
  };

  const trend = calculateTrend();

  // Get properties by health status
  const getPropertiesByStatus = () => {
    if (!properties || properties.length === 0) return { critical: [], attention: [], healthy: [] };

    return {
      critical: properties.filter(p => p.status === "critical"),
      attention: properties.filter(p => p.status === "attention"),
      healthy: properties.filter(p => p.status === "ok")
    };
  };

  const propertiesByStatus = getPropertiesByStatus();

  // Animate score on mount and when it changes
  useEffect(() => {
    let startTime: number;
    const duration = 1500; // 1.5 seconds

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentScore = Math.floor(healthScore * easeOutQuart);

      setAnimatedScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [healthScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-green-400";
    if (score >= 60) return "from-yellow-500 to-amber-400";
    if (score >= 40) return "from-orange-500 to-yellow-500";
    return "from-red-500 to-orange-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  // Calculate circle progress
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Portfolio Health Score</h3>
        </div>
        {trend !== "stable" && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === "up" ? "text-emerald-400" : "text-red-400"
          }`}>
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{trend === "up" ? "Improving" : "Declining"}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center mb-6">
        {/* Animated Circular Progress */}
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-white/10"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${getScoreGradient(animatedScore).split(' ')[0].replace('from-', 'text-')}`} stopColor="currentColor" />
                <stop offset="100%" className={`${getScoreGradient(animatedScore).split(' ')[1].replace('to-', 'text-')}`} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold ${getScoreColor(animatedScore)} transition-colors`}>
              {animatedScore}
            </div>
            <div className="text-sm text-white/60 mt-1">out of 100</div>
            <div className={`text-xs font-medium mt-2 px-3 py-1 rounded-full ${
              animatedScore >= 80 ? "bg-emerald-500/20 text-emerald-400" :
              animatedScore >= 60 ? "bg-yellow-500/20 text-yellow-400" :
              animatedScore >= 40 ? "bg-orange-500/20 text-orange-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {getScoreLabel(animatedScore)}
            </div>
          </div>

        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Total Properties</span>
          <span className="font-semibold">{properties.length || totalProperties}</span>
        </div>

        {/* Property Status Breakdown */}
        {properties.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-white/60">Healthy</span>
              </div>
              <span className="font-semibold text-green-400">{propertiesByStatus.healthy.length}</span>
            </div>
            {propertiesByStatus.attention.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/60">Needs Attention</span>
                </div>
                <span className="font-semibold text-yellow-400">{propertiesByStatus.attention.length}</span>
              </div>
            )}
            {propertiesByStatus.critical.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-white/60">Critical</span>
                </div>
                <span className="font-semibold text-red-400">{propertiesByStatus.critical.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Issues Impact */}
        {criticalIssues > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Critical Issues</span>
            <span className="font-semibold text-red-400">-{criticalIssues * 15} points</span>
          </div>
        )}
        {importantIssues > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Important Issues</span>
            <span className="font-semibold text-yellow-400">-{importantIssues * 5} points</span>
          </div>
        )}
        {criticalIssues === 0 && importantIssues === 0 && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">No active issues!</span>
          </div>
        )}
      </div>

      {/* Detailed View Toggle */}
      {properties.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm font-medium text-white/80 flex items-center justify-center gap-2"
        >
          {showDetails ? "Hide Details" : "View Property Details"}
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Expanded Details */}
      {showDetails && properties.length > 0 && (
        <div className="mt-4 space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-sm font-semibold text-white/90 mb-3">Property Health Details</h4>
          {propertiesByStatus.critical.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-red-400 font-medium uppercase">Critical Attention Needed</p>
              {propertiesByStatus.critical.map((prop) => (
                <div key={prop.id} className="text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
                  <div className="font-medium text-white/90">{prop.name}</div>
                  {prop.latestReport && (
                    <div className="text-white/60 mt-1">
                      {prop.latestReport.criticalIssues} critical, {prop.latestReport.importantIssues} important
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {propertiesByStatus.attention.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-yellow-400 font-medium uppercase">Needs Attention</p>
              {propertiesByStatus.attention.map((prop) => (
                <div key={prop.id} className="text-xs bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                  <div className="font-medium text-white/90">{prop.name}</div>
                  {prop.latestReport && (
                    <div className="text-white/60 mt-1">
                      {prop.latestReport.importantIssues} issue(s) found
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {propertiesByStatus.healthy.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-green-400 font-medium uppercase">Healthy Properties</p>
              <div className="text-xs text-white/60 bg-green-500/10 border border-green-500/20 rounded p-2">
                {propertiesByStatus.healthy.map(p => p.name).join(", ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {animatedScore < 80 && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            💡 <span className="font-medium">Tip:</span> {
              propertiesByStatus.critical.length > 0
                ? `Address critical issues in ${propertiesByStatus.critical[0].name} first to improve your score quickly.`
                : criticalIssues > 0
                ? "Address critical issues first to improve your score quickly."
                : "Regular maintenance can help prevent future issues."
            }
          </p>
        </div>
      )}
    </div>
  );
}
