"use client";
import { useState } from "react";
import { Flame, Droplet, Calendar, Wrench, AlertTriangle, Edit, Check, X } from "lucide-react";

interface EquipmentUnit {
  id: string;
  propertyAddress: string;
  type: 'hvac' | 'water_heater';
  make: string;
  model: string;
  installDate: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
}

const SAMPLE_EQUIPMENT: EquipmentUnit[] = [
  {
    id: '1',
    propertyAddress: '123 Oak Street',
    type: 'hvac',
    make: 'Carrier',
    model: '24ABC3',
    installDate: '2015-06-15',
    lastServiceDate: '2024-08-20',
    nextServiceDue: '2025-02-20'
  },
  {
    id: '2',
    propertyAddress: '123 Oak Street',
    type: 'water_heater',
    make: 'Rheem',
    model: 'Marathon 50',
    installDate: '2016-03-10',
    lastServiceDate: '2024-07-05',
    nextServiceDue: '2025-01-05'
  },
  {
    id: '3',
    propertyAddress: '456 Maple Ave',
    type: 'hvac',
    make: 'Trane',
    model: 'XR14',
    installDate: '2019-04-22',
    lastServiceDate: '2024-09-15',
    nextServiceDue: '2025-03-15'
  },
  {
    id: '4',
    propertyAddress: '456 Maple Ave',
    type: 'water_heater',
    make: 'AO Smith',
    model: 'Signature 40',
    installDate: '2018-11-08',
    lastServiceDate: '2024-06-12',
    nextServiceDue: '2024-12-12'
  },
  {
    id: '5',
    propertyAddress: '789 Pine Road',
    type: 'hvac',
    make: 'Lennox',
    model: 'ML14XC1',
    installDate: '2021-07-30',
    lastServiceDate: '2024-10-01',
    nextServiceDue: '2025-04-01'
  },
  {
    id: '6',
    propertyAddress: '789 Pine Road',
    type: 'water_heater',
    make: 'Bradford White',
    model: 'M-I-40T6FBN',
    installDate: '2020-02-14',
    lastServiceDate: '2024-08-28',
    nextServiceDue: '2025-02-28'
  }
];

interface PropertyEquipment {
  propertyAddress: string;
  equipment: EquipmentUnit[];
}

export default function EquipmentInventory() {
  const [filter, setFilter] = useState<'all' | 'hvac' | 'water_heater'>('all');
  const [equipment, setEquipment] = useState<EquipmentUnit[]>(SAMPLE_EQUIPMENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDates, setEditDates] = useState<{lastService: string; nextService: string}>({
    lastService: '',
    nextService: ''
  });

  const calculateAge = (installDate: string): number => {
    const install = new Date(installDate);
    const now = new Date();
    return now.getFullYear() - install.getFullYear();
  };

  const getAgeColor = (age: number): string => {
    if (age <= 5) return 'text-green-400';
    if (age <= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isServiceOverdue = (nextServiceDue?: string): boolean => {
    if (!nextServiceDue) return false;
    return new Date(nextServiceDue) < new Date();
  };

  const handleEditClick = (equipmentItem: EquipmentUnit) => {
    setEditingId(equipmentItem.id);
    setEditDates({
      lastService: equipmentItem.lastServiceDate || '',
      nextService: equipmentItem.nextServiceDue || ''
    });
  };

  const handleSaveDates = (id: string) => {
    setEquipment(prev => prev.map(item =>
      item.id === id
        ? { ...item, lastServiceDate: editDates.lastService, nextServiceDue: editDates.nextService }
        : item
    ));
    setEditingId(null);
    setEditDates({ lastService: '', nextService: '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDates({ lastService: '', nextService: '' });
  };

  // Group equipment by property
  const groupEquipmentByProperty = (): PropertyEquipment[] => {
    const grouped = new Map<string, EquipmentUnit[]>();

    equipment.forEach(item => {
      if (!grouped.has(item.propertyAddress)) {
        grouped.set(item.propertyAddress, []);
      }
      grouped.get(item.propertyAddress)!.push(item);
    });

    return Array.from(grouped.entries()).map(([address, equip]) => ({
      propertyAddress: address,
      equipment: equip
    }));
  };

  const propertyGroups = groupEquipmentByProperty();

  const filteredGroups = propertyGroups.map(group => ({
    ...group,
    equipment: group.equipment.filter(item => {
      if (filter === 'all') return true;
      return item.type === filter;
    })
  })).filter(group => group.equipment.length > 0);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Equipment Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filter === 'all'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({equipment.length})
          </button>
          <button
            onClick={() => setFilter('hvac')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filter === 'hvac'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            HVAC ({equipment.filter(e => e.type === 'hvac').length})
          </button>
          <button
            onClick={() => setFilter('water_heater')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filter === 'water_heater'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Water Heaters ({equipment.filter(e => e.type === 'water_heater').length})
          </button>
        </div>
      </div>

      {/* Equipment Grouped by Property */}
      <div className="space-y-4">
        {filteredGroups.map((propertyGroup) => (
          <div key={propertyGroup.propertyAddress} className="glass-card rounded-xl p-5">
            {/* Property Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <Wrench className="w-5 h-5 text-red-400" />
              <h3 className="text-base font-semibold">{propertyGroup.propertyAddress}</h3>
              <span className="ml-auto text-xs text-white/60">
                {propertyGroup.equipment.length} {propertyGroup.equipment.length === 1 ? 'unit' : 'units'}
              </span>
            </div>

            {/* Equipment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {propertyGroup.equipment.map((equipmentItem) => {
                const age = calculateAge(equipmentItem.installDate);
                const isEditing = editingId === equipmentItem.id;

                return (
                  <div
                    key={equipmentItem.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all border border-white/10"
                  >
                    {/* Equipment Header */}
                    <div className="flex items-center gap-3 mb-3">
                      {equipmentItem.type === 'hvac' ? (
                        <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center border border-blue-400/30">
                          <Flame className="w-6 h-6 text-blue-300" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-cyan-500/30 flex items-center justify-center border border-cyan-400/30">
                          <Droplet className="w-6 h-6 text-cyan-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white">
                          {equipmentItem.type === 'hvac' ? 'HVAC System' : 'Water Heater'}
                        </div>
                        <div className="text-xs text-white/70">{equipmentItem.make} {equipmentItem.model}</div>
                      </div>
                    </div>

                    {/* Equipment Details */}
                    <div className="space-y-2">
                      {/* Age */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Age:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getAgeColor(age)}`}>
                            {age} {age === 1 ? 'year' : 'years'}
                          </span>
                          {age >= 10 && (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Last Service */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Last Service:</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDates.lastService}
                            onChange={(e) => setEditDates(prev => ({ ...prev, lastService: e.target.value }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-400"
                          />
                        ) : (
                          <span className="text-white/90 font-medium">{formatDate(equipmentItem.lastServiceDate)}</span>
                        )}
                      </div>

                      {/* Next Service */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Next Service:</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDates.nextService}
                            onChange={(e) => setEditDates(prev => ({ ...prev, nextService: e.target.value }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-400"
                          />
                        ) : (
                          <span className={`font-medium ${
                            isServiceOverdue(equipmentItem.nextServiceDue) ? 'text-red-400' : 'text-white/90'
                          }`}>
                            {formatDate(equipmentItem.nextServiceDue)}
                            {isServiceOverdue(equipmentItem.nextServiceDue) && ' ⚠️'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-white/10">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveDates(equipmentItem.id)}
                            className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs font-medium text-green-400">Save</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs font-medium text-red-400">Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(equipmentItem)}
                          className="w-full px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">Edit Service Dates</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {equipment.filter(e => calculateAge(e.installDate) >= 10).length}
              </div>
              <div className="text-sm text-white/60">Units 10+ Years Old</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {equipment.filter(e => isServiceOverdue(e.nextServiceDue)).length}
              </div>
              <div className="text-sm text-white/60">Service Overdue</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {equipment.filter(e => {
                  const next = e.nextServiceDue ? new Date(e.nextServiceDue) : null;
                  if (!next) return false;
                  const in30Days = new Date();
                  in30Days.setDate(in30Days.getDate() + 30);
                  return next <= in30Days && next >= new Date();
                }).length}
              </div>
              <div className="text-sm text-white/60">Service Due Soon</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
