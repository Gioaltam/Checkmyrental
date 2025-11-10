"use client";
import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Home,
  ArrowRight,
  Calendar,
  Wrench,
  ExternalLink
} from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
  lastInspection?: string;
  reports: Array<{
    id: string;
    date: string;
    criticalIssues: number;
    importantIssues: number;
  }>;
  latestReport?: {
    criticalIssues: number;
    importantIssues: number;
    date: string;
  };
}

interface ExecutiveSummaryProps {
  portfolioData: {
    totalProperties: number;
    totalCritical: number;
    totalImportant: number;
    propertiesWithCritical: number;
  };
  properties?: Property[];
  userName?: string;
}

export default function ExecutiveSummary({ portfolioData, properties = [], userName }: ExecutiveSummaryProps) {
  const [expandedProperty, setExpandedProperty] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate brief loading for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [portfolioData]);

  // Generate concise summary
  const generateSummary = () => {
    const { totalProperties, totalCritical, totalImportant, propertiesWithCritical } = portfolioData;

    if (totalCritical > 0) {
      const plural = propertiesWithCritical > 1 ? 'properties require' : 'property requires';
      return `${propertiesWithCritical} ${plural} immediate attention — ${totalCritical} critical issue${totalCritical > 1 ? 's' : ''} detected that need professional review.`;
    }

    if (totalImportant > 0) {
      return `${totalImportant} important issue${totalImportant > 1 ? 's' : ''} should be addressed within 30 days to prevent future problems.`;
    }

    return `All ${totalProperties} propert${totalProperties > 1 ? 'ies are' : 'y is'} in excellent condition with no critical or important issues.`;
  };

  const getSentimentConfig = () => {
    if (portfolioData.totalCritical > 0) {
      return {
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/20",
        border: "border-red-500/30",
        label: "Critical",
        labelBg: "bg-red-500/20",
        labelBorder: "border-red-500/40",
        labelText: "text-red-400"
      };
    }
    if (portfolioData.totalImportant > 0) {
      return {
        icon: TrendingUp,
        color: "text-yellow-400",
        bg: "bg-yellow-500/20",
        border: "border-yellow-500/30",
        label: "Attention",
        labelBg: "bg-yellow-500/20",
        labelBorder: "border-yellow-500/40",
        labelText: "text-yellow-400"
      };
    }
    return {
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      label: "Excellent",
      labelBg: "bg-green-500/20",
      labelBorder: "border-green-500/40",
      labelText: "text-green-400"
    };
  };

  const criticalProperties = properties.filter(p => p.status === "critical");
  const attentionProperties = properties.filter(p => p.status === "attention");
  const config = getSentimentConfig();
  const Icon = config.icon;

  return (
    <section
      className="relative rounded-2xl p-7 border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl shadow-2xl"
      role="region"
      aria-labelledby="portfolio-summary-heading"
      ref={summaryRef}
    >
      {/* Header with Better Visual Hierarchy */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4 flex-1">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${config.bg} border-2 ${config.border} flex items-center justify-center shadow-lg`}>
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" aria-label="Loading summary" />
            ) : (
              <Icon className={`w-6 h-6 ${config.color}`} aria-hidden="true" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <h2 id="portfolio-summary-heading" className="text-xl font-bold text-white tracking-tight">
                Portfolio Summary
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${config.labelBg} ${config.labelText} border-2 ${config.labelBorder} shadow-sm`}>
                {config.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-xs font-bold rounded-lg border border-blue-400/40 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                AI
              </span>
            </div>

            {/* Key Metrics Badges - More Prominent */}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/80 rounded-lg font-semibold border border-white/20 shadow-sm">
                <Home className="w-4 h-4" aria-hidden="true" />
                {portfolioData.totalProperties} {portfolioData.totalProperties === 1 ? 'Property' : 'Properties'}
              </span>
              {portfolioData.totalCritical > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/30 text-red-200 rounded-lg font-bold border-2 border-red-500/50 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" aria-hidden="true"></span>
                  {portfolioData.totalCritical} Critical
                </span>
              )}
              {portfolioData.totalImportant > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/25 text-yellow-200 rounded-lg font-semibold border border-yellow-500/50 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" aria-hidden="true"></span>
                  {portfolioData.totalImportant} Important
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3" aria-live="polite" aria-busy="true">
          <div className="h-5 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded animate-pulse bg-[length:200%_100%]"></div>
          <div className="h-5 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded animate-pulse bg-[length:200%_100%] w-5/6"></div>
          <div className="h-5 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded animate-pulse bg-[length:200%_100%] w-4/6"></div>
          <p className="text-sm text-white/50 font-medium mt-3">Analyzing your portfolio...</p>
        </div>
      ) : (
        <>
          {/* Main Summary Text - More Concise */}
          <div className="mb-6" aria-live="polite">
            <p className="text-lg text-white/95 leading-relaxed font-medium">
              {generateSummary()}
            </p>
          </div>

          {/* Critical Properties - Completely Redesigned */}
          {criticalProperties.length > 0 && (
            <div className="mt-6 rounded-xl overflow-hidden border-2 border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/5 shadow-lg" role="region" aria-labelledby="critical-properties-heading">
              <div className="bg-gradient-to-r from-red-500/30 to-red-600/20 border-b-2 border-red-500/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500 shadow-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 id="critical-properties-heading" className="text-lg font-bold text-white">
                        Critical Properties ({criticalProperties.length})
                      </h3>
                      <p className="text-xs text-red-200/80 font-medium">Requires immediate attention</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-red-500/20">
                {criticalProperties.map((prop, idx) => {
                  const criticalCount = prop.latestReport?.criticalIssues || 0;
                  const importantCount = prop.latestReport?.importantIssues || 0;
                  const isExpanded = expandedProperty === idx;

                  return (
                    <div key={idx} className="group hover:bg-red-500/10 transition-all">
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MapPin className="w-4 h-4 text-red-400" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-base mb-2 leading-tight">
                                {prop.address}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/40 text-red-200 rounded-lg text-sm font-bold border border-red-500/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" aria-hidden="true"></span>
                                  {criticalCount} critical
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/30 text-yellow-200 rounded-lg text-sm font-semibold border border-yellow-500/50">
                                  {importantCount} important
                                </span>
                                {prop.lastInspection && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/60 rounded-lg text-xs font-medium">
                                    <Calendar className="w-3 h-3" aria-hidden="true" />
                                    {new Date(prop.lastInspection).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setExpandedProperty(isExpanded ? null : idx)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded-lg text-sm font-medium border border-white/20 transition-all"
                                  aria-expanded={isExpanded}
                                  aria-controls={`property-details-${idx}`}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                                      View Details
                                    </>
                                  )}
                                </button>
                                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 rounded-lg text-sm font-medium border border-blue-500/40 transition-all">
                                  <Wrench className="w-4 h-4" aria-hidden="true" />
                                  Schedule Repair
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div
                            id={`property-details-${idx}`}
                            className="mt-4 pt-4 border-t border-red-500/30"
                          >
                            <div className="p-4 bg-black/30 rounded-lg border border-red-500/30">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <div className="flex-1">
                                  <p className="text-sm text-red-200/90 leading-relaxed font-medium mb-3">
                                    <strong className="font-bold text-red-200">Immediate Action Required:</strong> This property has {criticalCount} critical issue{criticalCount !== 1 ? 's' : ''} that need professional attention to prevent damage or safety concerns.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/40 text-red-200 rounded-lg text-xs font-medium border border-red-500/50 transition-all">
                                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                      View Full Report
                                    </button>
                                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-xs font-medium border border-white/20 transition-all">
                                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                                      View Photos
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attention Properties Summary - Improved */}
          {attentionProperties.length > 0 && criticalProperties.length === 0 && (
            <div className="mt-6 rounded-xl overflow-hidden border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 shadow-lg">
              <div className="bg-gradient-to-r from-yellow-500/25 to-yellow-600/15 border-b-2 border-yellow-500/40 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/30 border border-yellow-500/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-300" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-100">
                      Properties Needing Attention ({attentionProperties.length})
                    </h3>
                    <p className="text-xs text-yellow-200/70 font-medium">Address within 30 days</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <ul className="space-y-3">
                  {attentionProperties.map((prop, idx) => {
                    const importantCount = prop.latestReport?.importantIssues || 0;
                    return (
                      <li key={idx} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-yellow-500/30 hover:bg-black/30 transition-all">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" aria-hidden="true"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm mb-1">{prop.address}</p>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/30 text-yellow-200 rounded text-xs font-semibold border border-yellow-500/50">
                            {importantCount} important issue{importantCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Healthy Portfolio Message - Improved */}
          {criticalProperties.length === 0 && attentionProperties.length === 0 && (
            <div className="mt-6 rounded-xl overflow-hidden border-2 border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-500/5 shadow-lg">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-300 mb-2">
                      Excellent Portfolio Health
                    </h3>
                    <p className="text-sm text-white/85 leading-relaxed">
                      All properties are well-maintained with no issues detected. Continue quarterly inspections to maintain this excellent standard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
