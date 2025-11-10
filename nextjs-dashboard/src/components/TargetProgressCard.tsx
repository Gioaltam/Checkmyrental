'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { formatCurrency } from '../lib/portfolio-analytics';

interface TargetProgressCardProps {
  ytdSavings: number;
  className?: string;
}

export default function TargetProgressCard({
  ytdSavings,
  className = ''
}: TargetProgressCardProps) {
  const [target, setTarget] = useState<number>(50000); // Default target

  // Load target from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('annualSavingsTarget');
      if (saved) {
        setTarget(Number(saved));
      }
    }
  }, []);

  // Calculate progress metrics
  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const diffTime = Math.abs(currentDate.getTime() - startOfYear.getTime());
  const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthsElapsed = daysElapsed / 30.44; // Average days per month

  // Forecast year-end savings based on current pace
  const forecastedSavings = monthsElapsed > 0 ? (ytdSavings / monthsElapsed) * 12 : 0;

  // Progress percentage
  const progressPercentage = target > 0 ? (ytdSavings / target) * 100 : 0;
  const forecastedPercentage = target > 0 ? (forecastedSavings / target) * 100 : 0;

  // Determine if on track (forecasted >= 95% of target)
  const isOnTrack = forecastedPercentage >= 95;

  // Calculate months remaining
  const monthsRemaining = 12 - monthsElapsed;

  // Calculate monthly savings needed to hit target
  const monthlySavingsNeeded = monthsRemaining > 0
    ? Math.max(0, (target - ytdSavings) / monthsRemaining)
    : 0;

  // Current monthly run rate
  const currentMonthlyRate = monthsElapsed > 0 ? ytdSavings / monthsElapsed : 0;

  return (
    <div className={`glass-card rounded-xl p-8 border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isOnTrack
              ? 'bg-gradient-to-br from-green-500/20 to-green-600/20'
              : 'bg-gradient-to-br from-amber-500/20 to-orange-600/20'
          }`}>
            <Target className={`w-6 h-6 ${isOnTrack ? 'text-green-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Savings Target Progress</h3>
            <p className="text-sm text-white/60">Track your annual savings goal</p>
          </div>
        </div>

        {/* On-Track Badge */}
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
          isOnTrack
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {isOnTrack ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">On Track</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Off Track</span>
            </>
          )}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* YTD Savings */}
        <div>
          <div className="text-sm text-white/60 mb-1">YTD Savings</div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(ytdSavings)}
          </div>
          <div className="text-xs text-white/50">
            {progressPercentage.toFixed(1)}% of annual target
          </div>
        </div>

        {/* Annual Target */}
        <div>
          <div className="text-sm text-white/60 mb-1">Annual Target</div>
          <div className="text-3xl font-bold text-green-400 mb-1">
            {formatCurrency(target)}
          </div>
          <div className="text-xs text-white/50">
            Set in settings
          </div>
        </div>

        {/* Forecasted Year-End */}
        <div>
          <div className="text-sm text-white/60 mb-1 flex items-center gap-1">
            Forecasted Year-End
            <Info className="w-3 h-3" />
          </div>
          <div className={`text-3xl font-bold mb-1 ${
            isOnTrack ? 'text-green-400' : 'text-amber-400'
          }`}>
            {formatCurrency(forecastedSavings)}
          </div>
          <div className="text-xs text-white/50">
            {forecastedPercentage.toFixed(1)}% of target
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">Target Achievement</span>
          <span className="text-sm font-medium text-white">
            {formatCurrency(target - ytdSavings)} remaining
          </span>
        </div>

        {/* Dual Progress Bar (Current + Forecast) */}
        <div className="relative h-10 bg-white/10 rounded-lg overflow-hidden">
          {/* Forecasted Progress (lighter) */}
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 ${
              isOnTrack
                ? 'bg-gradient-to-r from-green-500/30 to-green-400/30'
                : 'bg-gradient-to-r from-amber-500/30 to-orange-400/30'
            }`}
            style={{ width: `${Math.min(forecastedPercentage, 100)}%` }}
          />

          {/* Current Progress (solid) */}
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 ${
              isOnTrack
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-amber-500 to-orange-400'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />

          {/* Labels */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <span className="text-xs font-medium text-white z-10">
              Current: {progressPercentage.toFixed(0)}%
            </span>
            <span className="text-xs text-white/60 z-10">
              Forecast: {forecastedPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${
              isOnTrack ? 'bg-green-500' : 'bg-amber-500'
            }`}></div>
            <span className="text-white/60">YTD Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${
              isOnTrack ? 'bg-green-500/30' : 'bg-amber-500/30'
            }`}></div>
            <span className="text-white/60">Year-End Forecast</span>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Pace */}
        <div className={`p-4 rounded-lg ${
          isOnTrack
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-amber-500/10 border border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className={`w-4 h-4 ${isOnTrack ? 'text-green-400' : 'text-amber-400'}`} />
            <span className="text-sm font-medium text-white">Current Monthly Pace</span>
          </div>
          <div className={`text-2xl font-bold ${isOnTrack ? 'text-green-400' : 'text-amber-400'}`}>
            {formatCurrency(currentMonthlyRate)}<span className="text-sm text-white/60">/mo</span>
          </div>
          <div className="text-xs text-white/60 mt-1">
            Based on {monthsElapsed.toFixed(1)} months elapsed
          </div>
        </div>

        {/* Required Monthly Pace */}
        <div className={`p-4 rounded-lg ${
          currentMonthlyRate >= monthlySavingsNeeded
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-blue-500/10 border border-blue-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {currentMonthlyRate >= monthlySavingsNeeded ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-sm font-medium text-white">Required Monthly</span>
          </div>
          <div className={`text-2xl font-bold ${
            currentMonthlyRate >= monthlySavingsNeeded ? 'text-green-400' : 'text-blue-400'
          }`}>
            {formatCurrency(monthlySavingsNeeded)}<span className="text-sm text-white/60">/mo</span>
          </div>
          <div className="text-xs text-white/60 mt-1">
            For remaining {monthsRemaining.toFixed(1)} months
          </div>
        </div>
      </div>

      {/* Action Message */}
      {!isOnTrack && (
        <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-400 mb-1">Action Needed</p>
              <p className="text-sm text-white/80">
                To reach your target, you need to increase your monthly savings by{' '}
                <span className="font-semibold text-white">
                  {formatCurrency(monthlySavingsNeeded - currentMonthlyRate)}
                </span>
                . Check the Next Best Actions section below for high-impact opportunities.
              </p>
            </div>
          </div>
        </div>
      )}

      {isOnTrack && forecastedSavings > target && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-400 mb-1">Exceeding Target!</p>
              <p className="text-sm text-white/80">
                At your current pace, you're projected to exceed your target by{' '}
                <span className="font-semibold text-white">
                  {formatCurrency(forecastedSavings - target)}
                </span>
                . Great work maintaining proactive property management!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}