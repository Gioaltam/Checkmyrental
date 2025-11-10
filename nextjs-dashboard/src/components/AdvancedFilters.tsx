"use client";
import { useState, useEffect } from "react";
import { X, Check, Calendar, Save, Trash2, SlidersHorizontal } from "lucide-react";

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    statuses: string[];
    dateRange: { start: string; end: string } | null;
    minIssues: number;
    maxIssues: number;
  };
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  currentFilters: {
    statuses: string[];
    dateRange: { start: string; end: string } | null;
    minIssues: number;
    maxIssues: number;
  };
}

export default function AdvancedFilters({
  isOpen,
  onClose,
  onApply,
  currentFilters
}: AdvancedFiltersProps) {
  const [statuses, setStatuses] = useState<string[]>(currentFilters.statuses);
  const [dateRange, setDateRange] = useState(currentFilters.dateRange);
  const [minIssues, setMinIssues] = useState(currentFilters.minIssues);
  const [maxIssues, setMaxIssues] = useState(currentFilters.maxIssues);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filter-presets');
    if (saved) {
      setPresets(JSON.parse(saved));
    }
  }, []);

  const handleStatusToggle = (status: string) => {
    setStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleApply = () => {
    onApply({
      statuses,
      dateRange,
      minIssues,
      maxIssues
    });
    onClose();
  };

  const handleReset = () => {
    setStatuses([]);
    setDateRange(null);
    setMinIssues(0);
    setMaxIssues(999);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: {
        statuses,
        dateRange,
        minIssues,
        maxIssues
      }
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('filter-presets', JSON.stringify(updated));
    setPresetName("");
    setShowSavePreset(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setStatuses(preset.filters.statuses);
    setDateRange(preset.filters.dateRange);
    setMinIssues(preset.filters.minIssues);
    setMaxIssues(preset.filters.maxIssues);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('filter-presets', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl max-w-2xl w-full shadow-2xl border-2 border-white/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/50 backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Advanced Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Multi-Select */}
          <div>
            <label className="text-sm font-semibold text-white/80 block mb-3">Property Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "ok", label: "Healthy", color: "emerald" },
                { key: "attention", label: "Needs Attention", color: "amber" },
                { key: "critical", label: "Critical", color: "red" }
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => handleStatusToggle(key)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    statuses.includes(key)
                      ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-400`
                      : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statuses.includes(key) && <Check className="w-4 h-4" />}
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-semibold text-white/80 block mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange?.start || ""}
                  onChange={(e) => setDateRange(prev => ({ start: e.target.value, end: prev?.end || "" }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange?.end || ""}
                  onChange={(e) => setDateRange(prev => ({ start: prev?.start || "", end: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            {dateRange && (dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                Clear date range
              </button>
            )}
          </div>

          {/* Issue Count Range */}
          <div>
            <label className="text-sm font-semibold text-white/80 block mb-3">Issue Count</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Minimum</label>
                <input
                  type="number"
                  min="0"
                  value={minIssues}
                  onChange={(e) => setMinIssues(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Maximum</label>
                <input
                  type="number"
                  min="0"
                  value={maxIssues}
                  onChange={(e) => setMaxIssues(parseInt(e.target.value) || 999)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                />
              </div>
            </div>
          </div>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-white/80 block mb-3">Saved Presets</label>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 text-left text-sm text-white/80 hover:text-white"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Delete preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Current Filters as Preset */}
          <div>
            {!showSavePreset ? (
              <button
                onClick={() => setShowSavePreset(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save as Preset
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName("");
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-black/50 backdrop-blur-xl p-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
          >
            Reset All
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-500/20"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
