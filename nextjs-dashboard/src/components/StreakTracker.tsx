"use client";
import { useEffect, useState } from "react";
import { Flame, Award, Calendar } from "lucide-react";

interface StreakTrackerProps {
  latestCriticalIssueDate?: string;
  totalProperties?: number;
}

export default function StreakTracker({ latestCriticalIssueDate, totalProperties = 0 }: StreakTrackerProps) {
  const [daysWithoutIssues, setDaysWithoutIssues] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    calculateStreak();
  }, [latestCriticalIssueDate]);

  const calculateStreak = () => {
    if (!latestCriticalIssueDate) {
      // No critical issues ever - use a large number
      setDaysWithoutIssues(365);
      setStreak(365);
      return;
    }

    const lastIssueDate = new Date(latestCriticalIssueDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastIssueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setDaysWithoutIssues(diffDays);

    // Animate the counter
    animateCounter(diffDays);
  };

  const animateCounter = (targetDays: number) => {
    let startTime: number;
    const duration = 1000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(targetDays * easeOutQuart);

      setStreak(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const getMilestone = (days: number) => {
    if (days >= 365) return { text: "1 Year Streak!", icon: "🏆", color: "text-yellow-400" };
    if (days >= 180) return { text: "6 Month Streak!", icon: "🌟", color: "text-purple-400" };
    if (days >= 90) return { text: "90 Day Streak!", icon: "⭐", color: "text-blue-400" };
    if (days >= 30) return { text: "30 Day Streak!", icon: "✨", color: "text-green-400" };
    if (days >= 7) return { text: "1 Week Streak!", icon: "🔥", color: "text-orange-400" };
    return null;
  };

  const milestone = getMilestone(daysWithoutIssues);

  const getNextMilestone = (days: number) => {
    if (days < 7) return { target: 7, label: "7 days" };
    if (days < 30) return { target: 30, label: "30 days" };
    if (days < 90) return { target: 90, label: "90 days" };
    if (days < 180) return { target: 180, label: "180 days" };
    if (days < 365) return { target: 365, label: "1 year" };
    return { target: 730, label: "2 years" };
  };

  const nextMilestone = getNextMilestone(daysWithoutIssues);
  const progressToNext = (daysWithoutIssues / nextMilestone.target) * 100;

  return (
    <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300 relative overflow-hidden">
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${daysWithoutIssues >= 30 ? 'text-orange-400' : 'text-orange-400/60'}`} />
            <h3 className="text-lg font-semibold">Issue-Free Streak</h3>
          </div>
          {milestone && (
            <div className={`flex items-center gap-1 text-sm font-medium ${milestone.color}`}>
              <Award className="w-4 h-4" />
              <span>{milestone.icon}</span>
            </div>
          )}
        </div>

        {/* Main Counter */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3">
            <div className="text-6xl font-bold text-orange-400">
              {streak}
            </div>
            <div className="text-left">
              <div className="text-2xl font-semibold text-white/90">
                {daysWithoutIssues === 1 ? 'day' : 'days'}
              </div>
              <div className="text-sm text-white/60">without critical issues</div>
            </div>
          </div>

          {milestone && (
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              daysWithoutIssues >= 365 ? 'bg-yellow-500/20 border border-yellow-500/30' :
              daysWithoutIssues >= 180 ? 'bg-purple-500/20 border border-purple-500/30' :
              daysWithoutIssues >= 90 ? 'bg-blue-500/20 border border-blue-500/30' :
              'bg-green-500/20 border border-green-500/30'
            }`}>
              <span className="text-2xl">{milestone.icon}</span>
              <span className={`font-semibold ${milestone.color}`}>{milestone.text}</span>
            </div>
          )}
        </div>

        {/* Progress to Next Milestone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Next milestone</span>
            <span className="font-semibold text-white/80">{nextMilestone.label}</span>
          </div>
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            >
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{daysWithoutIssues} days</span>
            <span>{nextMilestone.target - daysWithoutIssues} days to go</span>
          </div>
        </div>

        {/* Fun Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xs text-white/60 mb-1">Properties Managed</div>
            <div className="text-2xl font-bold text-white/90">{totalProperties}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xs text-white/60 mb-1">Weeks</div>
            <div className="text-2xl font-bold text-white/90">{Math.floor(daysWithoutIssues / 7)}</div>
          </div>
        </div>

        {/* Motivational Message */}
        {daysWithoutIssues >= 7 && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-xs text-orange-300 text-center">
              {daysWithoutIssues >= 90
                ? "🎉 Amazing work! Your properties are in excellent condition!"
                : daysWithoutIssues >= 30
                ? "🔥 Keep it up! You're maintaining your properties well!"
                : "👍 Great start! Continue with regular maintenance!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
