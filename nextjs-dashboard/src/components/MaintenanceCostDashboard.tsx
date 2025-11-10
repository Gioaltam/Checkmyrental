"use client";
import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";

interface CostRecord {
  month: string;
  hvac: number;
  waterHeater: number;
  filters: number;
}

const SAMPLE_COSTS: CostRecord[] = [
  { month: 'Jun 2024', hvac: 150, waterHeater: 80, filters: 45 },
  { month: 'Jul 2024', hvac: 0, waterHeater: 0, filters: 45 },
  { month: 'Aug 2024', hvac: 320, waterHeater: 120, filters: 45 },
  { month: 'Sep 2024', hvac: 0, waterHeater: 0, filters: 45 },
  { month: 'Oct 2024', hvac: 180, waterHeater: 0, filters: 45 },
  { month: 'Nov 2024', hvac: 0, waterHeater: 95, filters: 45 }
];

export default function MaintenanceCostDashboard() {
  const [costs, setCosts] = useState<CostRecord[]>(SAMPLE_COSTS);
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y'>('6m');

  const getFilteredCosts = () => {
    const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
    return costs.slice(-months);
  };

  const filteredCosts = getFilteredCosts();

  const calculateTotals = () => {
    return filteredCosts.reduce(
      (acc, record) => ({
        hvac: acc.hvac + record.hvac,
        waterHeater: acc.waterHeater + record.waterHeater,
        filters: acc.filters + record.filters,
        total: acc.total + record.hvac + record.waterHeater + record.filters
      }),
      { hvac: 0, waterHeater: 0, filters: 0, total: 0 }
    );
  };

  const totals = calculateTotals();
  const monthlyAvg = Math.round(totals.total / filteredCosts.length);

  // Calculate trend
  const firstHalf = filteredCosts.slice(0, Math.floor(filteredCosts.length / 2));
  const secondHalf = filteredCosts.slice(Math.floor(filteredCosts.length / 2));

  const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.hvac + r.waterHeater + r.filters, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.hvac + r.waterHeater + r.filters, 0) / secondHalf.length;

  const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
  const trendPercentage = Math.abs(Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100));

  // Find max value for chart scaling
  const maxValue = Math.max(...filteredCosts.map(r => r.hvac + r.waterHeater + r.filters));

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">Maintenance Costs</h3>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {['3m', '6m', '1y'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                timeframe === tf
                  ? 'bg-red-500/30 text-red-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tf === '3m' ? '3 Months' : tf === '6m' ? '6 Months' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-white/60 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-white">${totals.total}</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-white/60'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend !== 'stable' && `${trendPercentage}% vs previous period`}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-xs text-white/60 mb-1">Monthly Average</div>
          <div className="text-2xl font-bold text-white">${monthlyAvg}</div>
          <div className="text-xs text-white/60 mt-1">per month</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">
          Cost Breakdown
        </div>
        <div className="space-y-3">
          {/* HVAC */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/80">HVAC Service</span>
              <span className="text-sm font-semibold text-white">${totals.hvac}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(totals.hvac / totals.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Water Heater */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/80">Water Heater Service</span>
              <span className="text-sm font-semibold text-white">${totals.waterHeater}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${(totals.waterHeater / totals.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/80">Filter Replacements</span>
              <span className="text-sm font-semibold text-white">${totals.filters}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(totals.filters / totals.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">
          Monthly Spending
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {filteredCosts.map((record, index) => {
            const total = record.hvac + record.waterHeater + record.filters;
            const heightPercent = maxValue > 0 ? (total / maxValue) * 100 : 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                {/* Bar */}
                <div className="relative w-full flex flex-col-reverse gap-0.5" style={{ height: '100px' }}>
                  {/* HVAC */}
                  {record.hvac > 0 && (
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:opacity-80"
                      style={{ height: `${(record.hvac / total) * heightPercent}%` }}
                      title={`HVAC: $${record.hvac}`}
                    />
                  )}
                  {/* Water Heater */}
                  {record.waterHeater > 0 && (
                    <div
                      className="w-full bg-cyan-500 transition-all duration-300 hover:opacity-80"
                      style={{ height: `${(record.waterHeater / total) * heightPercent}%` }}
                      title={`Water Heater: $${record.waterHeater}`}
                    />
                  )}
                  {/* Filters */}
                  {record.filters > 0 && (
                    <div
                      className="w-full bg-green-500 rounded-b transition-all duration-300 hover:opacity-80"
                      style={{ height: `${(record.filters / total) * heightPercent}%` }}
                      title={`Filters: $${record.filters}`}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="text-[10px] text-white/60 text-center">
                  {record.month.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-white/60">HVAC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-white/60">Water Heater</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-white/60">Filters</span>
        </div>
      </div>
    </div>
  );
}
