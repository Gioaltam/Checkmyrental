"use client";
import { useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, X, Edit2, Trash2, User, FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface Appointment {
  id: string;
  title: string;
  type: "inspection" | "maintenance" | "meeting" | "other";
  date: Date;
  time: string;
  duration: number; // in minutes
  location: string;
  property?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface ScheduleManagerProps {
  onClose?: () => void;
}

export default function ScheduleManager({ onClose }: ScheduleManagerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Sample appointments data
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "1",
      title: "Property Inspection - Sunset Villa",
      type: "inspection",
      date: new Date(2024, 2, 14),
      time: "10:00 AM",
      duration: 120,
      location: "Sunset Villa",
      property: "Sunset Villa",
      status: "scheduled",
      notes: "Annual inspection - check HVAC system"
    },
    {
      id: "2",
      title: "HVAC Maintenance - Oak Manor",
      type: "maintenance",
      date: new Date(2024, 2, 20),
      time: "2:00 PM",
      duration: 90,
      location: "Oak Manor",
      property: "Oak Manor",
      status: "scheduled"
    },
    {
      id: "3",
      title: "Tenant Meeting",
      type: "meeting",
      date: new Date(2024, 2, 18),
      time: "11:00 AM",
      duration: 60,
      location: "Office",
      status: "scheduled"
    }
  ]);

  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    title: "",
    type: "inspection",
    time: "09:00 AM",
    duration: 60,
    location: "",
    notes: "",
    status: "scheduled"
  });

  // Calendar helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt =>
      apt.date.getDate() === date.getDate() &&
      apt.date.getMonth() === date.getMonth() &&
      apt.date.getFullYear() === date.getFullYear()
    );
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
  };

  const handleSaveAppointment = () => {
    if (!newAppointment.title || !selectedDate) return;

    const appointment: Appointment = {
      id: Date.now().toString(),
      title: newAppointment.title!,
      type: newAppointment.type as any,
      date: selectedDate,
      time: newAppointment.time!,
      duration: newAppointment.duration!,
      location: newAppointment.location!,
      property: newAppointment.property,
      notes: newAppointment.notes,
      status: "scheduled"
    };

    if (editingAppointment) {
      setAppointments(appointments.map(apt =>
        apt.id === editingAppointment.id ? { ...appointment, id: editingAppointment.id } : apt
      ));
      setEditingAppointment(null);
    } else {
      setAppointments([...appointments, appointment]);
    }

    setShowAppointmentForm(false);
    setNewAppointment({
      title: "",
      type: "inspection",
      time: "09:00 AM",
      duration: 60,
      location: "",
      notes: "",
      status: "scheduled"
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "inspection": return "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400";
      case "maintenance": return "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400";
      case "meeting": return "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400";
      default: return "from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "inspection": return <FileText className="w-4 h-4" />;
      case "maintenance": return <Clock className="w-4 h-4" />;
      case "meeting": return <User className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const upcomingAppointments = appointments
    .filter(apt => apt.date >= new Date() && apt.status === "scheduled")
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-7xl h-[90vh] bg-gradient-to-br from-[rgb(20,20,30)] to-[rgb(15,15,25)] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Schedule Manager</h2>
              <p className="text-sm text-white/60">Manage inspections, maintenance, and appointments</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "calendar"
                    ? "bg-blue-500/20 text-blue-400 shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-blue-500/20 text-blue-400 shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                List
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
            >
              <X className="w-5 h-5 text-white/60 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Calendar/List View */}
          <div className="flex-1 overflow-y-auto p-6">
            {viewMode === "calendar" ? (
              <div className="space-y-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                  <button
                    onClick={handlePreviousMonth}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <h3 className="text-xl font-bold text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <button
                    onClick={handleNextMonth}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-white/60 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const dayAppointments = getAppointmentsForDate(date);
                      const isToday =
                        date.getDate() === new Date().getDate() &&
                        date.getMonth() === new Date().getMonth() &&
                        date.getFullYear() === new Date().getFullYear();
                      const isSelected =
                        selectedDate &&
                        date.getDate() === selectedDate.getDate() &&
                        date.getMonth() === selectedDate.getMonth() &&
                        date.getFullYear() === selectedDate.getFullYear();

                      return (
                        <button
                          key={day}
                          onClick={() => handleDateClick(day)}
                          className={`aspect-square p-2 rounded-lg flex flex-col items-center justify-start gap-1 transition-all hover:scale-105 ${
                            isSelected
                              ? "bg-blue-500/30 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
                              : isToday
                              ? "bg-blue-500/10 border border-blue-500/30"
                              : "bg-white/5 hover:bg-white/10 border border-white/10"
                          }`}
                        >
                          <span className={`text-sm font-medium ${isToday ? "text-blue-400" : "text-white"}`}>
                            {day}
                          </span>
                          {dayAppointments.length > 0 && (
                            <div className="flex gap-1">
                              {dayAppointments.slice(0, 3).map((apt, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    apt.type === "inspection" ? "bg-blue-400" :
                                    apt.type === "maintenance" ? "bg-orange-400" :
                                    apt.type === "meeting" ? "bg-purple-400" : "bg-gray-400"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // List View
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">All Appointments</h3>
                {appointments
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map(apt => (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-xl border bg-gradient-to-br ${getTypeColor(apt.type)} backdrop-blur-sm hover:scale-[1.02] transition-all`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeIcon(apt.type)}
                            <h4 className="font-semibold text-white">{apt.title}</h4>
                          </div>
                          <div className="space-y-1 text-sm text-white/70">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{apt.date.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{apt.time} ({apt.duration} min)</span>
                            </div>
                            {apt.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{apt.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAppointment(apt);
                              setNewAppointment(apt);
                              setSelectedDate(apt.date);
                              setShowAppointmentForm(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                          >
                            <Edit2 className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(apt.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-96 border-l border-white/10 bg-black/20 p-6 space-y-6 overflow-y-auto">
            {/* Quick Add Button */}
            <button
              onClick={() => {
                setShowAppointmentForm(true);
                setEditingAppointment(null);
                if (!selectedDate) setSelectedDate(new Date());
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </button>

            {/* Selected Date Appointments */}
            {selectedDate && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {getAppointmentsForDate(selectedDate).length > 0 ? (
                  getAppointmentsForDate(selectedDate).map(apt => (
                    <div
                      key={apt.id}
                      className={`p-3 rounded-lg border bg-gradient-to-br ${getTypeColor(apt.type)} backdrop-blur-sm`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {getTypeIcon(apt.type)}
                        <div className="flex-1">
                          <h4 className="font-medium text-white text-sm">{apt.title}</h4>
                          <p className="text-xs text-white/60">{apt.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/40">No appointments scheduled</p>
                )}
              </div>
            )}

            {/* Upcoming Appointments */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Upcoming</h3>
              {upcomingAppointments.map(apt => (
                <div
                  key={apt.id}
                  className={`p-3 rounded-lg border bg-gradient-to-br ${getTypeColor(apt.type)} backdrop-blur-sm cursor-pointer hover:scale-105 transition-all`}
                  onClick={() => setSelectedDate(apt.date)}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {getTypeIcon(apt.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-white text-sm">{apt.title}</h4>
                      <p className="text-xs text-white/60">
                        {apt.date.toLocaleDateString()} • {apt.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Form Modal */}
      {showAppointmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-gradient-to-br from-[rgb(25,25,35)] to-[rgb(20,20,30)] rounded-2xl border border-white/10 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                {editingAppointment ? "Edit Appointment" : "New Appointment"}
              </h3>
              <button
                onClick={() => {
                  setShowAppointmentForm(false);
                  setEditingAppointment(null);
                }}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
                <input
                  type="text"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g., Property Inspection"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
                  <select
                    value={newAppointment.type}
                    onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="inspection">Inspection</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Time</label>
                  <input
                    type="time"
                    value={newAppointment.time?.replace(/\s*(AM|PM)/, "") || "09:00"}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="15"
                    step="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
                  <input
                    type="text"
                    value={newAppointment.location}
                    onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Property name or address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Notes (optional)</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  rows={3}
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAppointmentForm(false);
                  setEditingAppointment(null);
                }}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAppointment}
                disabled={!newAppointment.title || !selectedDate}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                {editingAppointment ? "Save Changes" : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
