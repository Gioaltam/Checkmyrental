"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

interface CalendarWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  highlightedDates?: Date[];
}

export default function CalendarWidget({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  highlightedDates = []
}: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentMonth.getMonth() === today.getMonth() &&
           currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() &&
           currentMonth.getMonth() === selectedDate.getMonth() &&
           currentMonth.getFullYear() === selectedDate.getFullYear();
  };

  const isHighlighted = (day: number) => {
    return highlightedDates.some(date =>
      day === date.getDate() &&
      currentMonth.getMonth() === date.getMonth() &&
      currentMonth.getFullYear() === date.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(newDate);
  };

  if (!isOpen) return null;

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        className="rounded-3xl p-8 w-full max-w-md mx-4 border border-white/20 shadow-2xl relative overflow-hidden"
        style={{
          animation: 'paperSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'top center',
          background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[rgba(59,130,246,0.08)] to-transparent pointer-events-none"></div>

        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-blue-500/30 rounded-tr-3xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Select Date</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center transition-all group"
          >
            <X className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-8 bg-white/[0.03] rounded-xl p-4 border border-white/10">
          <button
            onClick={previousMonth}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all group border border-transparent hover:border-white/20"
          >
            <ChevronLeft className="w-5 h-5 text-white/60 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
          </button>

          <div className="text-center">
            <div className="text-xl font-bold text-white">
              {monthNames[currentMonth.getMonth()]}
            </div>
            <div className="text-sm text-white/50 font-medium">
              {currentMonth.getFullYear()}
            </div>
          </div>

          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all group border border-transparent hover:border-white/20"
          >
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-xs font-bold text-white/50 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map(i => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}
          {days.map(day => (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square rounded-xl flex items-center justify-center text-sm font-bold
                transition-all duration-200 relative hover:scale-110
                ${isToday(day)
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400/60 shadow-xl shadow-blue-500/40'
                  : isSelected(day)
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-500/50 scale-105'
                  : isHighlighted(day)
                  ? 'bg-gradient-to-br from-yellow-500/40 to-yellow-600/30 text-yellow-200 shadow-lg shadow-yellow-500/30 border border-yellow-400/40'
                  : 'text-white/80 bg-white/[0.05] hover:bg-white/[0.15] hover:text-white border border-transparent hover:border-white/20'
                }
              `}
            >
              {day}
              {isHighlighted(day) && !isSelected(day) && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-md shadow-yellow-400/60"></div>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-400/40 shadow-lg shadow-blue-500/30"></div>
            <span className="text-white/70 font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-yellow-500/40 to-yellow-600/30 shadow-md"></div>
            <span className="text-white/70 font-medium">Inspections</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/40"></div>
            <span className="text-white/70 font-medium">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
