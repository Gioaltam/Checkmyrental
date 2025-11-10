"use client";
import { AlertTriangle, CheckCircle, Clock, Bell } from "lucide-react";

interface ActivityItem {
  type: "inspection" | "issue" | "resolution";
  message: string;
  time: string;
  propertyAddress?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  criticalIssues: number;
  recentActivity?: ActivityItem[];
  onViewCritical?: () => void;
  onActivityClick?: (activity: ActivityItem) => void;
}

export default function QuickActions({
  criticalIssues,
  recentActivity = [],
  onViewCritical,
  onActivityClick
}: QuickActionsProps) {
  return (
    <div
      className="relative rounded-xl p-6 border transition-all duration-200 overflow-hidden light-mode:border-gray-200 dark:border-white/10 light-mode:bg-white dark:bg-slate-800/50"
      style={{
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border light-mode:border-blue-300/30 dark:border-blue-400/30">
              <Bell className="w-6 h-6 light-mode:text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold light-mode:text-gray-900 dark:text-white">
                Action Center
              </h3>
              <p className="text-sm light-mode:text-gray-600 dark:text-white/60">Stay informed</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border light-mode:bg-gray-100 light-mode:border-gray-200 dark:bg-white/5 dark:border-white/10">
            <div className="w-2 h-2 rounded-full light-mode:bg-green-500 dark:bg-green-400"></div>
            <span className="text-xs font-medium light-mode:text-gray-700 dark:text-white/70">Live</span>
          </div>
        </div>

      <div className="space-y-4">
        {/* Critical Issues */}
        {criticalIssues > 0 ? (
          <div
            onClick={onViewCritical}
            className="relative p-4 rounded-lg border cursor-pointer transition-all duration-200 light-mode:bg-red-50/80 light-mode:border-red-200 light-mode:hover:border-red-300 dark:bg-red-500/10 dark:border-red-500/30 dark:hover:border-red-500/50"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border light-mode:border-red-300/30 dark:border-red-400/30">
                <AlertTriangle className="w-5 h-5 light-mode:text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold light-mode:text-gray-900 dark:text-white">
                    Critical Issues Pending
                  </h4>
                  <div className="px-2 py-0.5 rounded-full border light-mode:bg-red-100 light-mode:border-red-300 light-mode:text-red-700 dark:bg-red-500/20 dark:border-red-400/40 dark:text-red-300">
                    <span className="text-xs font-bold">{criticalIssues}</span>
                  </div>
                </div>
                <p className="text-sm mb-3 light-mode:text-gray-700 dark:text-white/70">
                  {criticalIssues} {criticalIssues === 1 ? "issue requires" : "issues require"} immediate attention
                </p>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 light-mode:bg-red-100 light-mode:border-red-300 light-mode:text-red-700 light-mode:hover:bg-red-200 dark:bg-red-500/20 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/30">
                  View all
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* All Clear State */}
        {criticalIssues === 0 ? (
          <div
            className="relative p-5 rounded-lg border transition-all duration-200 light-mode:bg-green-50/80 light-mode:border-green-200 dark:bg-green-500/10 dark:border-green-500/30"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center border light-mode:border-green-300/30 dark:border-green-400/30">
                <CheckCircle className="w-6 h-6 light-mode:text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold light-mode:text-gray-900 dark:text-white mb-1">
                  All Caught Up!
                </h4>
                <p className="text-sm light-mode:text-gray-700 dark:text-white/70">
                  No urgent actions required. Your properties are in excellent shape.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="pt-4 border-t light-mode:border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold light-mode:text-gray-900 dark:text-white flex items-center gap-2">
                Recent Activity
              </h4>
              <div className="px-2 py-0.5 rounded-full border light-mode:bg-gray-100 light-mode:border-gray-200 dark:bg-white/5 dark:border-white/10">
                <span className="text-xs font-semibold light-mode:text-gray-700 dark:text-white/70">{recentActivity.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {recentActivity.slice(0, 3).map((activity, index) => (
                <div
                  key={index}
                  onClick={() => onActivityClick?.(activity)}
                  className="relative p-3 rounded-lg border transition-all duration-200 cursor-pointer light-mode:border-gray-200 light-mode:hover:border-gray-300 light-mode:bg-gray-50/50 light-mode:hover:bg-gray-100 dark:border-white/10 dark:hover:border-white/20 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "inspection"
                        ? "bg-blue-400"
                        : activity.type === "issue"
                        ? "bg-red-400"
                        : "bg-green-400"
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium light-mode:text-gray-900 dark:text-white/90 mb-1">
                        {activity.message}
                      </p>
                      {activity.propertyAddress && (
                        <p className="text-xs light-mode:text-gray-600 dark:text-white/60 mb-1">
                          {activity.propertyAddress}
                        </p>
                      )}
                      <p className="text-xs flex items-center gap-1 light-mode:text-gray-500 dark:text-white/50">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
