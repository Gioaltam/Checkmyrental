"use client";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  showProgress?: boolean;
  progressValue?: number;
  showChart?: boolean;
  chartData?: number[];
  className?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({
  label,
  value,
  subtitle,
  trend,
  showProgress = false,
  progressValue = 0,
  showChart = false,
  chartData,
  className = "",
  icon,
}: MetricCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate number if it's numeric with easing
    if (typeof value === "number") {
      let startTime: number;
      const duration = 1500;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(value * easeOutQuart);

        setAnimatedValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  const displayValue = typeof value === "number" ? animatedValue : value;

  // Generate default sparkline data if not provided
  const sparklineData = chartData || [12, 19, 15, 21, 17, 25, 20, 30];

  // Create SVG path for sparkline
  const createSparklinePath = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const step = width / (data.length - 1);

    return data
      .map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`metric-card-wrapper relative group ${className}`}
    >
      {/* Card content */}
      <div className={`relative glass-card rounded-xl p-5 h-full transition-all duration-300 ${
        isHovered ? 'scale-[1.02]' : ''
      }`}>

        <div className="relative z-10">
          {/* Header with icon */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
                {icon && <span className="text-red-400">{icon}</span>}
                {label}
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-white">
                  {displayValue}
                </div>
                {trend && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    trend.startsWith("↑") ? "text-emerald-400" : trend.startsWith("↓") ? "text-red-400" : "text-white/60"
                  }`}>
                    {trend.startsWith("↑") && <TrendingUp className="w-4 h-4" />}
                    {trend.startsWith("↓") && <TrendingDown className="w-4 h-4" />}
                    <span>{trend}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Ring */}
            {showProgress && (
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="transform -rotate-90" width="56" height="56">
                  {/* Background circle */}
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="rgba(100,120,150,0.2)"
                    strokeWidth="4"
                  />
                  {/* Progress circle with gradient */}
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="4"
                    strokeDasharray={`${(progressValue / 100) * 138} 138`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(59,130,246)" />
                      <stop offset="100%" stopColor="rgb(37,99,235)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {Math.floor(progressValue)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {subtitle && (
            <div className="text-xs text-white/50 mb-2 flex items-center gap-1">
              {subtitle}
            </div>
          )}

          {/* Enhanced sparkline chart */}
          {showChart && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <svg className="w-full h-10" viewBox="0 0 100 30" preserveAspectRatio="none">
                {/* Gradient fill under the line */}
                <defs>
                  <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(96,165,250)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(96,165,250)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area under the line */}
                <path
                  d={`${createSparklinePath(sparklineData)} L 100,30 L 0,30 Z`}
                  fill="url(#sparklineGradient)"
                />
                {/* The line itself */}
                <path
                  d={createSparklinePath(sparklineData)}
                  fill="none"
                  stroke="rgb(96,165,250)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isHovered ? 'opacity-100' : 'opacity-70'}
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 4px rgb(96,165,250))' : 'none',
                    transition: 'all 0.3s'
                  }}
                />
                {/* Data points */}
                {isHovered && sparklineData.map((value, index) => {
                  const max = Math.max(...sparklineData);
                  const min = Math.min(...sparklineData);
                  const range = max - min || 1;
                  const x = (index / (sparklineData.length - 1)) * 100;
                  const y = 30 - ((value - min) / range) * 30;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="2"
                      fill="rgb(96,165,250)"
                    />
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
