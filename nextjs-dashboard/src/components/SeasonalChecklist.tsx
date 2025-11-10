"use client";
import { useState } from "react";
import { Sun, Snowflake, CheckCircle2, Circle, Trophy } from "lucide-react";

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  season: 'summer' | 'winter';
}

interface PropertyChecklist {
  propertyAddress: string;
  items: ChecklistItem[];
  completionRate: number;
}

const SAMPLE_CHECKLISTS: PropertyChecklist[] = [
  {
    propertyAddress: '123 Oak Street',
    completionRate: 75,
    items: [
      { id: '1', task: 'Clean/replace HVAC filters', completed: true, season: 'winter' },
      { id: '2', task: 'Test heating system', completed: true, season: 'winter' },
      { id: '3', task: 'Check thermostat battery', completed: true, season: 'winter' },
      { id: '4', task: 'Inspect water heater', completed: false, season: 'winter' },
      { id: '5', task: 'Seal windows and doors', completed: false, season: 'winter' },
      { id: '6', task: 'Check insulation', completed: true, season: 'winter' },
      { id: '7', task: 'Clean gutters', completed: true, season: 'winter' },
      { id: '8', task: 'Test carbon monoxide detectors', completed: false, season: 'winter' }
    ]
  },
  {
    propertyAddress: '456 Maple Ave',
    completionRate: 100,
    items: [
      { id: '9', task: 'Clean/replace HVAC filters', completed: true, season: 'winter' },
      { id: '10', task: 'Test heating system', completed: true, season: 'winter' },
      { id: '11', task: 'Check thermostat battery', completed: true, season: 'winter' },
      { id: '12', task: 'Inspect water heater', completed: true, season: 'winter' },
      { id: '13', task: 'Seal windows and doors', completed: true, season: 'winter' },
      { id: '14', task: 'Check insulation', completed: true, season: 'winter' },
      { id: '15', task: 'Clean gutters', completed: true, season: 'winter' },
      { id: '16', task: 'Test carbon monoxide detectors', completed: true, season: 'winter' }
    ]
  }
];

export default function SeasonalChecklist() {
  const [checklists, setChecklists] = useState<PropertyChecklist[]>(SAMPLE_CHECKLISTS);
  const [currentSeason, setCurrentSeason] = useState<'summer' | 'winter'>('winter');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(SAMPLE_CHECKLISTS[0].propertyAddress);

  const toggleTask = (propertyAddress: string, itemId: string) => {
    setChecklists(prev => prev.map(checklist => {
      if (checklist.propertyAddress !== propertyAddress) return checklist;

      const updatedItems = checklist.items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const completedCount = updatedItems.filter(i => i.completed).length;
      const completionRate = Math.round((completedCount / updatedItems.length) * 100);

      return {
        ...checklist,
        items: updatedItems,
        completionRate
      };
    }));
  };

  const overallCompletion = Math.round(
    checklists.reduce((sum, c) => sum + c.completionRate, 0) / checklists.length
  );

  const totalCompleted = checklists.reduce(
    (sum, c) => sum + c.items.filter(i => i.completed).length,
    0
  );

  const totalTasks = checklists.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {currentSeason === 'winter' ? (
            <Snowflake className="w-5 h-5 text-cyan-400" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-400" />
          )}
          <h3 className="text-lg font-semibold">Seasonal Maintenance</h3>
        </div>

        {/* Season Toggle */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setCurrentSeason('winter')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentSeason === 'winter'
                ? 'bg-cyan-500/30 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            Winter
          </button>
          <button
            onClick={() => setCurrentSeason('summer')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentSeason === 'summer'
                ? 'bg-yellow-500/30 text-yellow-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Sun className="w-3 h-3" />
            Summer
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-5 bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-white/80">Overall Progress</div>
          <div className="flex items-center gap-2">
            {overallCompletion === 100 && (
              <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
            )}
            <span className="text-xl font-bold text-white">{overallCompletion}%</span>
          </div>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overallCompletion === 100
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${overallCompletion}%` }}
          />
        </div>
        <div className="text-xs text-white/60 mt-2">
          {totalCompleted} of {totalTasks} tasks completed
        </div>
      </div>

      {/* Property Checklists */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {checklists.map((checklist) => {
          const isExpanded = expandedProperty === checklist.propertyAddress;
          const completedCount = checklist.items.filter(i => i.completed).length;

          return (
            <div
              key={checklist.propertyAddress}
              className="rounded-lg border border-white/10 overflow-hidden transition-all"
            >
              {/* Property Header */}
              <button
                onClick={() => setExpandedProperty(isExpanded ? null : checklist.propertyAddress)}
                className="w-full p-4 bg-white/5 hover:bg-white/10 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-white mb-1">
                      {checklist.propertyAddress}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-white/60">
                        {completedCount}/{checklist.items.length} completed
                      </div>
                      {checklist.completionRate === 100 && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Trophy className="w-3 h-3" />
                          <span className="font-semibold">All Done!</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      {/* Circular Progress */}
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-white/10"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - checklist.completionRate / 100)}`}
                          className={checklist.completionRate === 100 ? 'text-green-400' : 'text-cyan-400'}
                          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                        {checklist.completionRate}%
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Checklist Items */}
              {isExpanded && (
                <div className="p-4 space-y-2 bg-black/20 animate-in fade-in duration-300">
                  {checklist.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleTask(checklist.propertyAddress, item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        item.completed
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm text-left ${
                        item.completed ? 'text-white/60 line-through' : 'text-white/90'
                      }`}>
                        {item.task}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Encouragement Message */}
      {overallCompletion === 100 && (
        <div className="mt-5 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="font-semibold text-green-400">Perfect Score!</div>
              <div className="text-xs text-white/70">All properties are ready for {currentSeason}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
