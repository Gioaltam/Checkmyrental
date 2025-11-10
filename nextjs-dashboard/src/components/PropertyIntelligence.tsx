"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  AlertTriangle,
  Wrench,
  Calendar,
  CheckCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  Info,
  Clock,
  Target
} from "lucide-react";

interface InsightCard {
  type: "trend" | "cost" | "pattern" | "seasonal" | "action";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  icon: string;
  action?: string;
  affectedProperties?: string[];
}

interface CostImpact {
  immediateRepairs?: string;
  preventiveSavings?: string;
  delayPenalty?: string;
}

interface PropertyIntelligenceProps {
  portfolioData: {
    totalProperties: number;
    totalCritical: number;
    totalImportant: number;
    propertiesWithCritical: number;
  };
  properties?: Array<{
    id: string;
    address: string;
    status?: string;
    latestReport?: {
      criticalIssues: number;
      importantIssues: number;
      date: string;
    };
  }>;
}

export default function PropertyIntelligence({ portfolioData, properties }: PropertyIntelligenceProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<{
    summary: string;
    insightCards: InsightCard[];
    trends: string[];
    costImpact?: CostImpact;
    seasonalAlerts: string[];
    priorityActions: string[];
    sentiment: "excellent" | "good" | "attention" | "critical";
  } | null>(null);

  // Generate cache key from portfolio data
  const getCacheKey = () => {
    const key = `${portfolioData.totalProperties}-${portfolioData.totalCritical}-${portfolioData.totalImportant}-${portfolioData.propertiesWithCritical}`;
    return `ai-intelligence-${key}`;
  };

  // Check cache before fetching
  const getCachedData = () => {
    try {
      const cacheKey = getCacheKey();
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        const isCacheValid = Date.now() - timestamp < 5 * 60 * 1000;
        if (isCacheValid) {
          return data;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  };

  // Save to cache
  const setCachedData = (data: any) => {
    try {
      const cacheKey = getCacheKey();
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [portfolioData]);

  const fetchIntelligence = async () => {
    // Check cache first
    const cached = getCachedData();
    if (cached) {
      setIntelligence(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use the correct backend URL from environment variable or default to port 8000
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/ai/property-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...portfolioData,
          properties: properties?.map(p => ({
            id: p.id,
            address: p.address,
            status: p.status,
            criticalIssues: p.latestReport?.criticalIssues || 0,
            importantIssues: p.latestReport?.importantIssues || 0,
            lastInspection: p.latestReport?.date
          }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIntelligence(data);
        // Cache the response
        setCachedData(data);
      } else {
        console.error('Failed to fetch intelligence:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch intelligence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      TrendingUp,
      TrendingDown,
      DollarSign,
      Zap,
      AlertTriangle,
      Wrench,
      Calendar,
      CheckCircle,
      Target
    };
    return icons[iconName] || Info;
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          bg: "from-red-500/15 to-red-600/10",
          border: "border-red-500/50",
          iconBg: "bg-red-500/20",
          iconBorder: "border-red-500/40",
          iconColor: "text-red-400",
          pulse: true
        };
      case "warning":
        return {
          bg: "from-yellow-500/15 to-yellow-600/10",
          border: "border-yellow-500/50",
          iconBg: "bg-yellow-500/20",
          iconBorder: "border-yellow-500/40",
          iconColor: "text-yellow-400",
          pulse: false
        };
      default:
        return {
          bg: "from-blue-500/10 to-purple-500/5",
          border: "border-blue-500/30",
          iconBg: "bg-blue-500/15",
          iconBorder: "border-blue-500/30",
          iconColor: "text-blue-400",
          pulse: false
        };
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl p-7 border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Property Intelligence</h2>
            <div className="h-5 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded animate-pulse w-64"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  if (!intelligence) return null;

  return (
    <section className="rounded-2xl p-7 border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Property Intelligence</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-xs font-bold rounded-lg border border-blue-400/40">
                <Sparkles className="w-3.5 h-3.5" />
                Powered by AI
              </span>
            </div>
            <p className="text-base text-white/90 leading-relaxed font-medium">
              {intelligence.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {intelligence.insightCards.map((card, idx) => {
          const Icon = getIconComponent(card.icon);
          const config = getSeverityConfig(card.severity);

          return (
            <div
              key={idx}
              className={`group rounded-xl p-5 border-2 bg-gradient-to-br ${config.bg} ${config.border} hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${config.iconBg} border ${config.iconBorder} flex items-center justify-center flex-shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}>
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white mb-1 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              {card.action && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded-lg text-xs font-medium border border-white/20 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {card.action}
                  </button>
                </div>
              )}

              {card.affectedProperties && card.affectedProperties.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {card.affectedProperties.slice(0, 2).map((prop, i) => (
                    <span key={i} className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                      {prop}
                    </span>
                  ))}
                  {card.affectedProperties.length > 2 && (
                    <span className="text-xs text-white/60">+{card.affectedProperties.length - 2} more</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Cost Impact & Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Impact */}
        {intelligence.costImpact && (
          <div className="rounded-xl p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-bold text-white">Cost Impact Analysis</h3>
            </div>
            <div className="space-y-3">
              {intelligence.costImpact.immediateRepairs && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Immediate Repairs</span>
                  <span className="text-sm font-bold text-white">{intelligence.costImpact.immediateRepairs}</span>
                </div>
              )}
              {intelligence.costImpact.preventiveSavings && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Preventive Savings</span>
                  <span className="text-sm font-bold text-green-400">{intelligence.costImpact.preventiveSavings}</span>
                </div>
              )}
              {intelligence.costImpact.delayPenalty && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Delay Cost</span>
                  <span className="text-sm font-bold text-red-400">{intelligence.costImpact.delayPenalty}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {intelligence.priorityActions && intelligence.priorityActions.length > 0 && (
          <div className="rounded-xl p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Priority Actions</h3>
            </div>
            <ul className="space-y-2">
              {intelligence.priorityActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Seasonal Alerts (if any) */}
      {intelligence.seasonalAlerts && intelligence.seasonalAlerts.length > 0 && (
        <div className="mt-4 rounded-xl p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-purple-300 mb-2">Seasonal Reminders</h3>
              <ul className="space-y-1">
                {intelligence.seasonalAlerts.slice(0, 3).map((alert, idx) => (
                  <li key={idx} className="text-xs text-white/70">• {alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
