'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Settings,
  X,
  Zap,
  Shield,
  Clock,
  PiggyBank,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';
import {
  CostAssumptions,
  COST_ASSUMPTION_PRESETS,
  DEFAULT_ASSUMPTIONS,
  loadAssumptions,
  saveAssumptions
} from '../lib/savings-model';
import {
  computeYtdSavings,
  formatCurrency,
  getSavingsCategoryColor,
  YTDSavings,
  PropertyData
} from '../lib/portfolio-analytics';

interface SavingsPanelProps {
  properties: PropertyData[];
  className?: string;
}

export default function SavingsPanel({ properties, className = '' }: SavingsPanelProps) {
  const [assumptions, setAssumptions] = useState<CostAssumptions>(DEFAULT_ASSUMPTIONS);
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'likely' | 'aggressive'>('likely');
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [ytdSavings, setYtdSavings] = useState<YTDSavings | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load assumptions from localStorage on mount
  useEffect(() => {
    const loaded = loadAssumptions();
    setAssumptions(loaded);

    // Determine which scenario is selected based on loaded assumptions
    const scenarioName = loaded.scenarioName?.toLowerCase();
    if (scenarioName && ['conservative', 'likely', 'aggressive'].includes(scenarioName)) {
      setSelectedScenario(scenarioName as 'conservative' | 'likely' | 'aggressive');
    }
  }, []);

  // Compute savings whenever properties or assumptions change
  useEffect(() => {
    const savings = computeYtdSavings(properties, assumptions);
    setYtdSavings(savings);
  }, [properties, assumptions]);

  // Handle scenario change
  const handleScenarioChange = (scenario: 'conservative' | 'likely' | 'aggressive') => {
    setSelectedScenario(scenario);
    const newAssumptions = { ...COST_ASSUMPTION_PRESETS[scenario] };
    setAssumptions(newAssumptions);
    saveAssumptions(newAssumptions);
    setHasUnsavedChanges(false);
  };

  // Handle individual assumption change
  const handleAssumptionChange = (key: keyof CostAssumptions, value: number) => {
    const newAssumptions = { ...assumptions, [key]: value };
    setAssumptions(newAssumptions);
    setHasUnsavedChanges(true);
  };

  // Save custom assumptions
  const handleSaveAssumptions = () => {
    saveAssumptions(assumptions);
    setHasUnsavedChanges(false);
  };

  // Reset to selected preset
  const handleResetAssumptions = () => {
    const preset = COST_ASSUMPTION_PRESETS[selectedScenario];
    setAssumptions(preset);
    saveAssumptions(preset);
    setHasUnsavedChanges(false);
  };

  // Savings category icons
  const categoryIcons: Record<string, React.ReactNode> = {
    avoidedEmergency: <Shield className="w-4 h-4" />,
    energy: <Zap className="w-4 h-4" />,
    downtime: <Clock className="w-4 h-4" />,
    capitalDeferral: <PiggyBank className="w-4 h-4" />
  };

  // Category labels
  const categoryLabels: Record<string, string> = {
    avoidedEmergency: 'Avoided Emergency Repairs',
    energy: 'Energy Efficiency',
    downtime: 'Reduced Downtime',
    capitalDeferral: 'Capital Deferral'
  };

  if (!ytdSavings) {
    return <div>Loading savings data...</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Savings Display */}
      <div className="glass-card rounded-xl p-8 border border-white/10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              Savings YTD
            </h2>
            <p className="text-white/60 text-sm">Based on {selectedScenario} scenario assumptions</p>
          </div>
          <button
            onClick={() => setShowAssumptions(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white/80 hover:text-white"
          >
            <Settings className="w-4 h-4" />
            Assumptions
          </button>
        </div>

        {/* Big Savings Number */}
        <div className="mb-8">
          <div className="text-5xl font-bold text-white mb-2">
            {formatCurrency(ytdSavings.realized.total)}
          </div>
          <div className="text-sm text-white/60">
            Realized Savings Year-to-Date
          </div>
        </div>

        {/* Realized vs Potential Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Progress to Potential</span>
            <span className="text-sm font-medium text-white">
              {ytdSavings.percentRealized.toFixed(1)}% Realized
            </span>
          </div>
          <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${ytdSavings.percentRealized}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <span className="text-xs font-medium text-white">
                {formatCurrency(ytdSavings.realized.total)}
              </span>
              <span className="text-xs text-white/60">
                Potential: {formatCurrency(ytdSavings.potential.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Savings Breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['avoidedEmergency', 'energy', 'downtime', 'capitalDeferral'] as const).map(category => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 text-white/70">
                {categoryIcons[category]}
                <span className="text-xs">{categoryLabels[category]}</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(ytdSavings.realized[category])}
              </div>
              <div className="text-xs text-white/50">
                of {formatCurrency(ytdSavings.potential[category])}
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${ytdSavings.potential[category] > 0 ? (ytdSavings.realized[category] / ytdSavings.potential[category]) * 100 : 0}%`,
                    backgroundColor: getSavingsCategoryColor(category)
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Scenario Toggle */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-sm text-white/70 mb-3">Scenario:</p>
          <div className="flex gap-2">
            {(['conservative', 'likely', 'aggressive'] as const).map(scenario => (
              <button
                key={scenario}
                onClick={() => handleScenarioChange(scenario)}
                className={`px-4 py-2 rounded-lg capitalize transition-all ${
                  selectedScenario === scenario
                    ? 'bg-green-500/20 text-green-400 border border-green-400/50'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                }`}
              >
                {scenario}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assumptions Drawer */}
      {showAssumptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-bold text-white">Cost Assumptions</h3>
                <p className="text-sm text-white/60 mt-1">Customize the financial model parameters</p>
              </div>
              <button
                onClick={() => setShowAssumptions(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Emergency Repair Costs */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    Emergency Repair Costs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Min Repair Cost
                      </label>
                      <input
                        type="number"
                        value={assumptions.emergencyRepairCostMin}
                        onChange={(e) => handleAssumptionChange('emergencyRepairCostMin', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Max Repair Cost
                      </label>
                      <input
                        type="number"
                        value={assumptions.emergencyRepairCostMax}
                        onChange={(e) => handleAssumptionChange('emergencyRepairCostMax', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Emergency Callout Fee
                      </label>
                      <input
                        type="number"
                        value={assumptions.emergencyCalloutFee}
                        onChange={(e) => handleAssumptionChange('emergencyCalloutFee', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Energy Efficiency */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    Energy Efficiency
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Annual Energy Spend
                      </label>
                      <input
                        type="number"
                        value={assumptions.annualEnergySpend}
                        onChange={(e) => handleAssumptionChange('annualEnergySpend', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Inefficiency % <Info className="inline w-3 h-3" />
                      </label>
                      <input
                        type="number"
                        value={assumptions.energyInefficiencyPercentage}
                        onChange={(e) => handleAssumptionChange('energyInefficiencyPercentage', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Downtime Costs */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Downtime Costs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Cost Per Day
                      </label>
                      <input
                        type="number"
                        value={assumptions.downtimeCostPerDay}
                        onChange={(e) => handleAssumptionChange('downtimeCostPerDay', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Avg Days Per Issue
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={assumptions.avgDowntimeDaysPerIssue}
                        onChange={(e) => handleAssumptionChange('avgDowntimeDaysPerIssue', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Capital Deferral */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-blue-400" />
                    Capital Deferral
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Equipment Replacement Cost
                      </label>
                      <input
                        type="number"
                        value={assumptions.equipmentReplacementCost}
                        onChange={(e) => handleAssumptionChange('equipmentReplacementCost', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Annual Maintenance Cost
                      </label>
                      <input
                        type="number"
                        value={assumptions.annualMaintenanceCost}
                        onChange={(e) => handleAssumptionChange('annualMaintenanceCost', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Life Extension (Years)
                      </label>
                      <input
                        type="number"
                        value={assumptions.lifeExtensionYears}
                        onChange={(e) => handleAssumptionChange('lifeExtensionYears', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Prevention Rates */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Issue Prevention Rates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Critical Issues Prevention %
                      </label>
                      <input
                        type="number"
                        value={assumptions.preventionRateCritical}
                        onChange={(e) => handleAssumptionChange('preventionRateCritical', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">
                        Important Issues Prevention %
                      </label>
                      <input
                        type="number"
                        value={assumptions.preventionRateImportant}
                        onChange={(e) => handleAssumptionChange('preventionRateImportant', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 text-white focus:outline-none focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={handleResetAssumptions}
                className="px-4 py-2 text-white/70 hover:text-white transition-all"
              >
                Reset to Preset
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssumptions(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssumptions}
                  disabled={!hasUnsavedChanges}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    hasUnsavedChanges
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-white/10 text-white/50 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}