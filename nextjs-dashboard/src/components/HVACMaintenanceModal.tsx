"use client";
import { useState, useEffect } from "react";
import { X, Wrench, Calendar, DollarSign, Plus, Trash2, CheckCircle } from "lucide-react";

interface MaintenanceRecord {
  id: string;
  date: string;
  type: "filter" | "service" | "repair" | "inspection";
  description: string;
  cost?: number;
  technician?: string;
  nextServiceDate?: string;
}

interface HVACMaintenanceModalProps {
  propertyAddress: string;
  onClose: () => void;
}

export default function HVACMaintenanceModal({ propertyAddress, onClose }: HVACMaintenanceModalProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    type: "filter",
    date: new Date().toISOString().split('T')[0],
    description: ""
  });

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [propertyAddress]);

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await fetch(`/api/hvac/records?property=${encodeURIComponent(propertyAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch HVAC records:", error);
    }
    setLoading(false);
  };

  const handleAddRecord = async () => {
    try {
      const response = await fetch('/api/hvac/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          property: propertyAddress,
          id: Date.now().toString()
        })
      });
      
      if (response.ok) {
        await fetchMaintenanceRecords();
        setShowAddForm(false);
        setNewRecord({
          type: "filter",
          date: new Date().toISOString().split('T')[0],
          description: ""
        });
      }
    } catch (error) {
      console.error("Failed to add record:", error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/hvac/records/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchMaintenanceRecords();
      }
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "filter": return "bg-blue-500/20 text-blue-400";
      case "service": return "bg-green-500/20 text-green-400";
      case "repair": return "bg-red-500/20 text-red-400";
      case "inspection": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getLastServiceDate = () => {
    const serviceRecords = records.filter(r => r.type === "service").sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return serviceRecords[0]?.date;
  };

  const getNextServiceDate = () => {
    const lastService = getLastServiceDate();
    if (lastService) {
      const date = new Date(lastService);
      date.setMonth(date.getMonth() + 6); // Service every 6 months
      return date.toISOString().split('T')[0];
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[rgb(20,20,20)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              HVAC Maintenance Tracker
            </h2>
            <p className="text-sm text-white/60 mt-1">{propertyAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-white/10">
          <div className="glass-card rounded-lg p-4">
            <div className="text-sm text-white/60 mb-1">Last Service</div>
            <div className="text-lg font-semibold">
              {getLastServiceDate() ? new Date(getLastServiceDate()!).toLocaleDateString() : "No records"}
            </div>
          </div>
          <div className="glass-card rounded-lg p-4">
            <div className="text-sm text-white/60 mb-1">Next Service Due</div>
            <div className="text-lg font-semibold text-yellow-400">
              {getNextServiceDate() ? new Date(getNextServiceDate()!).toLocaleDateString() : "Schedule service"}
            </div>
          </div>
          <div className="glass-card rounded-lg p-4">
            <div className="text-sm text-white/60 mb-1">Total Records</div>
            <div className="text-lg font-semibold">{records.length}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Add New Record Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Maintenance Record
            </button>
          )}

          {/* Add New Record Form */}
          {showAddForm && (
            <div className="glass-card rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">New Maintenance Record</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Date</label>
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Type</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({...newRecord, type: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="filter">Filter Change</option>
                    <option value="service">Regular Service</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-1">Description</label>
                  <input
                    type="text"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none"
                    placeholder="e.g., Replaced 20x25x1 filter"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Cost (optional)</label>
                  <input
                    type="number"
                    value={newRecord.cost || ""}
                    onChange={(e) => setNewRecord({...newRecord, cost: parseFloat(e.target.value) || undefined})}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Technician (optional)</label>
                  <input
                    type="text"
                    value={newRecord.technician || ""}
                    onChange={(e) => setNewRecord({...newRecord, technician: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/10 focus:border-blue-400 focus:outline-none"
                    placeholder="Company or technician name"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddRecord}
                  disabled={!newRecord.description}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  Save Record
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Maintenance Records List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card rounded-lg p-4">
                  <div className="h-5 bg-white/10 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-3">
              {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                <div key={record.id} className="glass-card rounded-lg p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                          {record.type.toUpperCase()}
                        </span>
                        <span className="text-sm text-white/60">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white/90">{record.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                        {record.cost && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${record.cost.toFixed(2)}
                          </div>
                        )}
                        {record.technician && (
                          <div>{record.technician}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-lg p-8 text-center">
              <Wrench className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">No maintenance records yet</p>
              <p className="text-sm text-white/40 mt-1">Start tracking your HVAC maintenance to keep your system running efficiently</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}