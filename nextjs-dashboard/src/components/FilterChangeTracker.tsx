"use client";
import { useState } from "react";
import { Filter, CheckCircle2, Clock, Plus } from "lucide-react";

interface FilterItem {
  id: string;
  propertyAddress: string;
  lastChanged: string;
  nextChangeDue: string;
  filterSize?: string;
  monthlyCost?: number;
}

const SAMPLE_FILTERS: FilterItem[] = [
  {
    id: '1',
    propertyAddress: '123 Oak Street',
    lastChanged: '2024-09-15',
    nextChangeDue: '2024-12-15',
    filterSize: '20x25x1',
    monthlyCost: 15
  },
  {
    id: '2',
    propertyAddress: '456 Maple Ave',
    lastChanged: '2024-10-01',
    nextChangeDue: '2025-01-01',
    filterSize: '16x25x1',
    monthlyCost: 12
  },
  {
    id: '3',
    propertyAddress: '789 Pine Road',
    lastChanged: '2024-08-20',
    nextChangeDue: '2024-11-20',
    filterSize: '20x20x1',
    monthlyCost: 18
  }
];

export default function FilterChangeTracker() {
  const [filters, setFilters] = useState<FilterItem[]>(SAMPLE_FILTERS);

  const calculateDaysUntil = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleMarkChanged = (id: string) => {
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setMonth(nextDate.getMonth() + 3); // Next change in 3 months

    setFilters(prev => prev.map(filter =>
      filter.id === id
        ? {
            ...filter,
            lastChanged: today.toISOString().split('T')[0],
            nextChangeDue: nextDate.toISOString().split('T')[0]
          }
        : filter
    ));
  };

  const isDue = (dateStr: string): boolean => {
    return calculateDaysUntil(dateStr) <= 7;
  };

  const sortedFilters = [...filters].sort((a, b) => {
    return calculateDaysUntil(a.nextChangeDue) - calculateDaysUntil(b.nextChangeDue);
  });

  const totalMonthlyCost = filters.reduce((sum, f) => sum + (f.monthlyCost || 0), 0);
  const dueCount = filters.filter(f => isDue(f.nextChangeDue)).length;

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">Filter Change Tracker</h3>
        </div>
        {dueCount > 0 && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
            {dueCount} due soon
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/60 mb-1">Monthly Cost</div>
          <div className="text-xl font-bold text-white">${totalMonthlyCost}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/60 mb-1">Properties</div>
          <div className="text-xl font-bold text-white">{filters.length}</div>
        </div>
      </div>

      {/* Filter List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedFilters.map((filter) => {
          const daysUntil = calculateDaysUntil(filter.nextChangeDue);
          const isOverdue = daysUntil < 0;
          const isDueSoon = isDue(filter.nextChangeDue);

          return (
            <div
              key={filter.id}
              className={`rounded-lg p-4 border transition-all ${
                isOverdue
                  ? 'bg-red-500/20 border-red-500/30'
                  : isDueSoon
                  ? 'bg-yellow-500/20 border-yellow-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {/* Property Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm text-white mb-1">
                    {filter.propertyAddress}
                  </div>
                  <div className="text-xs text-white/70">
                    {filter.filterSize && `Size: ${filter.filterSize}`}
                    {filter.monthlyCost && ` • $${filter.monthlyCost}/filter`}
                  </div>
                </div>
                {(isOverdue || isDueSoon) && (
                  <Clock className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`} />
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-xs mb-3">
                <div>
                  <span className="text-white/60">Last Changed:</span>
                  <span className="text-white/90 ml-1">
                    {new Date(filter.lastChanged).toLocaleDateString()}
                  </span>
                </div>
                <div className={`font-semibold ${
                  isOverdue ? 'text-red-400' : isDueSoon ? 'text-yellow-400' : 'text-white/90'
                }`}>
                  {isOverdue
                    ? `${Math.abs(daysUntil)} days overdue!`
                    : isDueSoon
                    ? `Due in ${daysUntil} days`
                    : `${daysUntil} days left`
                  }
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleMarkChanged(filter.id)}
                className={`w-full px-3 py-2 rounded-md transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                  isOverdue || isDueSoon
                    ? 'bg-green-500/30 hover:bg-green-500/40 text-green-400 border border-green-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Changed</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New Filter Button */}
      <button className="w-full mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all flex items-center justify-center gap-2 text-sm text-blue-400 font-medium">
        <Plus className="w-4 h-4" />
        <span>Add Property</span>
      </button>
    </div>
  );
}
