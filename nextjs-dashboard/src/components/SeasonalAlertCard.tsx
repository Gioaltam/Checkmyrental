"use client";
import { useEffect, useState } from "react";
import { getCurrentSeason, getRiskColor, getRiskBorderColor, getRiskTextColor, getRiskGlowColor, type SeasonData } from "@/lib/floridaSeasons";

export default function SeasonalAlertCard() {
  const [seasonData, setSeasonData] = useState<SeasonData | null>(null);
  const [riskBarWidth, setRiskBarWidth] = useState(0);

  useEffect(() => {
    // Get current season data
    const data = getCurrentSeason();
    setSeasonData(data);

    // Animate risk bar
    setTimeout(() => {
      setRiskBarWidth(data.riskLevel);
    }, 300);
  }, []);

  if (!seasonData) {
    return (
      <div className="glass-card rounded-xl p-5 h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/10 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card-wrapper relative group">
      <div className={`relative glass-card rounded-xl p-5 h-full transition-all duration-300 hover:scale-[1.02] ${getRiskBorderColor(seasonData.riskLevel)} border-2`}>

        {/* Animated background glow */}
        <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getRiskGlowColor(seasonData.riskLevel)} blur-xl`}></div>

        <div className="relative z-10">
          {/* Header with Icon */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-2 font-semibold">
                Florida Season
              </div>

              {/* Season Name with Risk Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-3xl animate-bounce-slow">{seasonData.icon}</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">
                    {seasonData.name}
                  </div>
                  <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${getRiskTextColor(seasonData.riskLevel)} bg-white/5 border ${getRiskBorderColor(seasonData.riskLevel)}`}>
                    {seasonData.riskText} RISK
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Risk Meter */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>Risk Level</span>
              <span className={`font-bold ${getRiskTextColor(seasonData.riskLevel)}`}>{seasonData.riskLevel}%</span>
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              {/* Animated fill bar */}
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getRiskColor(seasonData.riskLevel)} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${riskBarWidth}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Main Warning */}
          <div className="text-sm text-white/80 mb-3 font-medium">
            ⚠️ {seasonData.mainWarning}
          </div>

          {/* Countdown */}
          <div className="text-xs text-white/60 mb-3 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <span className="font-bold text-white">{seasonData.daysUntilNext}</span> days until{" "}
              <span className="text-white/80">{seasonData.nextSeasonName}</span>
            </span>
          </div>

          {/* Weather Data Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">Temp</div>
              <div className="text-sm font-semibold text-white">{seasonData.temperature}</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-xs text-white/50 mb-1">Humidity</div>
              <div className="text-sm font-semibold text-white">{seasonData.humidity}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">Rainfall</div>
              <div className="text-sm font-semibold text-white">{seasonData.rainfall}</div>
            </div>
          </div>

          {/* Historical Note (shown on hover) */}
          <div className="mt-3 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-xs text-white/60 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{seasonData.historicalNote}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
