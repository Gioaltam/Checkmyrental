"use client";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";

interface MaintenanceItem {
  id: string;
  propertyAddress: string;
  equipmentType: 'hvac' | 'water_heater';
  nextServiceDue: string;
}

const SAMPLE_ITEMS: MaintenanceItem[] = [
  {
    id: '1',
    propertyAddress: '456 Maple Ave',
    equipmentType: 'water_heater',
    nextServiceDue: '2024-12-12'
  },
  {
    id: '2',
    propertyAddress: '123 Oak Street',
    equipmentType: 'water_heater',
    nextServiceDue: '2025-01-05'
  },
  {
    id: '3',
    propertyAddress: '123 Oak Street',
    equipmentType: 'hvac',
    nextServiceDue: '2025-02-20'
  }
];

export default function MaintenanceCountdown() {
  const [items, setItems] = useState<MaintenanceItem[]>(SAMPLE_ITEMS);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const calculateDaysUntil = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number): string => {
    if (days < 0) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (days <= 15) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (days <= 30) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-green-400 bg-green-500/20 border-green-500/30';
  };

  const getProgressPercentage = (days: number): number => {
    // Assuming 180 days (6 months) is full cycle
    const maxDays = 180;
    if (days < 0) return 100;
    const percentage = ((maxDays - days) / maxDays) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const handleMarkComplete = (id: string) => {
    // In a real app, this would update the backend
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const sortedItems = [...items].sort((a, b) => {
    return calculateDaysUntil(a.nextServiceDue) - calculateDaysUntil(b.nextServiceDue);
  });

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Maintenance Countdown</h3>
        </div>
        <span className="text-xs text-white/60">{sortedItems.length} upcoming</span>
      </div>

      <div className="space-y-3">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => {
            const daysUntil = calculateDaysUntil(item.nextServiceDue);
            const isOverdue = daysUntil < 0;
            const urgencyColor = getUrgencyColor(daysUntil);
            const progress = getProgressPercentage(daysUntil);

            return (
              <div
                key={item.id}
                className={`rounded-lg p-4 border ${urgencyColor} transition-all hover:scale-[1.02]`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isOverdue && <AlertCircle className="w-4 h-4" />}
                      <span className="font-semibold text-sm">
                        {item.equipmentType === 'hvac' ? 'HVAC System' : 'Water Heater'}
                      </span>
                    </div>
                    <div className="text-xs text-white/70">{item.propertyAddress}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {isOverdue ? Math.abs(daysUntil) : daysUntil}
                    </div>
                    <div className="text-xs">
                      {isOverdue ? 'days overdue' : 'days left'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOverdue || daysUntil <= 15
                          ? 'bg-red-500'
                          : daysUntil <= 30
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleMarkComplete(item.id)}
                  className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Serviced</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-white/60">
            <Clock className="w-12 h-12 mx-auto mb-3 text-white/40" />
            <p>All maintenance is up to date!</p>
            <p className="text-xs text-white/40 mt-1">Great job staying on schedule</p>
          </div>
        )}
      </div>
    </div>
  );
}
