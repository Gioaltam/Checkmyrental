"use client";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface SeasonalTask {
  id: string;
  task_key: string;
  task_name: string;
  month: number;
  completed: boolean;
  completed_at: string | null;
  year: number;
}

interface SeasonalTasksCardProps {
  clientId: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Task icons based on task type
const getTaskIcon = (taskName: string): string => {
  const name = taskName.toLowerCase();
  if (name.includes("storm") || name.includes("hurricane") || name.includes("shutter")) return "🌀";
  if (name.includes("roof")) return "🏠";
  if (name.includes("hvac") || name.includes("a/c") || name.includes("ac")) return "❄️";
  if (name.includes("generator")) return "⚡";
  if (name.includes("drainage") || name.includes("gutter")) return "💧";
  if (name.includes("tree") || name.includes("exterior")) return "🌳";
  if (name.includes("emergency") || name.includes("supplies")) return "📦";
  if (name.includes("insurance") || name.includes("document")) return "📋";
  return "✓";
};

export default function SeasonalTasksCard({ clientId }: SeasonalTasksCardProps) {
  const [tasks, setTasks] = useState<SeasonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  const monthName = MONTH_NAMES[currentMonth - 1];

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [clientId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";
      const response = await fetch(
        `${API_BASE}/api/seasonal-tasks?client_id=${clientId}&month=${currentMonth}&year=${currentYear}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error("Error fetching seasonal tasks:", err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: SeasonalTask) => {
    const newCompleted = !task.completed;
    const taskKey = task.task_key;

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.task_key === taskKey
          ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : t
      )
    );

    setTogglingTask(taskKey);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";
      const response = await fetch(`${API_BASE}/api/seasonal-tasks/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          task_key: taskKey,
          completed: newCompleted,
          year: currentYear,
          month: currentMonth,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle task");
      }

      // Success - task was saved
    } catch (err) {
      console.error("Error toggling task:", err);
      // Rollback optimistic update
      setTasks(prev =>
        prev.map(t =>
          t.task_key === taskKey
            ? { ...t, completed: task.completed, completed_at: task.completed_at }
            : t
        )
      );
      setError("Failed to save task. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setTogglingTask(null);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-5 h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/10 rounded"></div>
                <div className="h-3 bg-white/10 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card-wrapper relative group">
      <div className="relative glass-card rounded-xl p-5 h-full transition-all duration-300 hover:scale-[1.02]">
        <div className="relative z-10">
          {/* Header */}
          <div className="mb-4">
            <div className="text-xs text-white/50 uppercase tracking-wider mb-2 font-semibold">
              This Month's Tasks
            </div>
            <div className="text-lg font-bold text-white mb-1">{monthName} {currentYear}</div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-white/60 font-semibold whitespace-nowrap">
                {completedCount} / {totalCount}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Tasks list */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-white/50 text-sm">
                No tasks for this month
              </div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  disabled={togglingTask === task.task_key}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-left group/task disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Custom Checkbox */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                        task.completed
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 scale-110"
                          : "border-white/30 group-hover/task:border-white/50 group-hover/task:scale-110"
                      }`}
                    >
                      {togglingTask === task.task_key ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      ) : task.completed ? (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      ) : null}
                    </div>
                  </div>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">{getTaskIcon(task.task_name)}</span>
                      <span
                        className={`text-sm transition-all duration-200 ${
                          task.completed
                            ? "text-white/50 line-through"
                            : "text-white/80 group-hover/task:text-white"
                        }`}
                      >
                        {task.task_name}
                      </span>
                    </div>
                    {task.completed && task.completed_at && (
                      <div className="text-xs text-white/40 mt-1 ml-7">
                        Completed {new Date(task.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          {totalCount > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Click tasks to mark as complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
