"use client";
import { useState, useRef, useEffect } from "react";
import { FileText, AlertTriangle, Calendar, User } from "lucide-react";

interface Report {
  id: string;
  date: string;
  property: string;
  inspector: string;
  status: string;
  criticalIssues: number;
  importantIssues: number;
  observations?: string;
  recommendations?: string;
}

interface ReportPreviewTooltipProps {
  report: Report;
  children: React.ReactNode;
}

export default function ReportPreviewTooltip({ report, children }: ReportPreviewTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Delay showing the tooltip slightly
    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        setIsVisible(true);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Extract top findings from observations
  const getTopFindings = () => {
    if (!report.observations) return [];
    const lines = report.observations.split('\n').filter(line => line.trim());
    return lines.slice(0, 3);
  };

  const topFindings = getTopFindings();

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="glass-card rounded-xl p-4 shadow-2xl border-2 border-white/20 max-w-md">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    Q{Math.floor(new Date(report.date).getMonth() / 3) + 1} {new Date(report.date).getFullYear()} Report
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-white/60 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {(report.criticalIssues > 0 || report.importantIssues > 0) && (
                <div className="flex items-center gap-1">
                  {report.criticalIssues > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {report.criticalIssues}
                    </span>
                  )}
                  {report.importantIssues > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      {report.importantIssues}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Inspector */}
            <div className="flex items-center gap-1 text-xs text-white/60 mb-3">
              <User className="w-3 h-3" />
              Inspector: {report.inspector}
            </div>

            {/* Top Findings */}
            {topFindings.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Top Findings</p>
                <ul className="space-y-1">
                  {topFindings.map((finding, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="flex-1">{finding.substring(0, 100)}{finding.length > 100 ? '...' : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Photo Count */}
            {report.status && (
              <div className="pt-2 border-t border-white/10 text-xs text-white/60">
                Status: <span className="text-white/80 font-medium">{report.status}</span>
              </div>
            )}

            {/* Action Hint */}
            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-blue-400 text-center">
              Click to view full report
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full">
            <div className="w-3 h-3 bg-white/10 border-r-2 border-b-2 border-white/20 rotate-45 backdrop-blur-xl"></div>
          </div>
        </div>
      )}
    </div>
  );
}
