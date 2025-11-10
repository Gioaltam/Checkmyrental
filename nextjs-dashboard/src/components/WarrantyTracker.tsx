"use client";
import { useState } from "react";
import { Shield, AlertTriangle, Clock, CheckCircle, FileText, Plus } from "lucide-react";

interface Warranty {
  id: string;
  propertyAddress: string;
  equipmentType: 'hvac' | 'water_heater';
  manufacturer: string;
  model: string;
  startDate: string;
  expiryDate: string;
  coverageType: string;
  documentUrl?: string;
}

const SAMPLE_WARRANTIES: Warranty[] = [
  {
    id: '1',
    propertyAddress: '123 Oak Street',
    equipmentType: 'hvac',
    manufacturer: 'Carrier',
    model: '24ABC3',
    startDate: '2015-06-15',
    expiryDate: '2025-06-15',
    coverageType: 'Parts & Labor',
    documentUrl: '#'
  },
  {
    id: '2',
    propertyAddress: '123 Oak Street',
    equipmentType: 'water_heater',
    manufacturer: 'Rheem',
    model: 'Marathon 50',
    startDate: '2016-03-10',
    expiryDate: '2026-03-10',
    coverageType: 'Parts Only',
    documentUrl: '#'
  },
  {
    id: '3',
    propertyAddress: '456 Maple Ave',
    equipmentType: 'hvac',
    manufacturer: 'Trane',
    model: 'XR14',
    startDate: '2019-04-22',
    expiryDate: '2024-04-22',
    coverageType: 'Parts & Labor'
  },
  {
    id: '4',
    propertyAddress: '456 Maple Ave',
    equipmentType: 'water_heater',
    manufacturer: 'AO Smith',
    model: 'Signature 40',
    startDate: '2018-11-08',
    expiryDate: '2024-11-08',
    coverageType: 'Parts Only',
    documentUrl: '#'
  }
];

export default function WarrantyTracker() {
  const [warranties, setWarranties] = useState<Warranty[]>(SAMPLE_WARRANTIES);

  const calculateDaysUntilExpiry = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWarrantyStatus = (daysUntil: number): 'active' | 'expiring_soon' | 'expired' => {
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 90) return 'expiring_soon';
    return 'active';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'expiring_soon':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'expired':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Shield className="w-5 h-5 text-green-400" />;
      case 'expiring_soon':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Shield className="w-5 h-5 text-white/40" />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  // Sort: expired first, then expiring soon, then active
  const sortedWarranties = [...warranties].sort((a, b) => {
    const aDays = calculateDaysUntilExpiry(a.expiryDate);
    const bDays = calculateDaysUntilExpiry(b.expiryDate);
    return aDays - bDays;
  });

  const stats = {
    active: warranties.filter(w => getWarrantyStatus(calculateDaysUntilExpiry(w.expiryDate)) === 'active').length,
    expiring: warranties.filter(w => getWarrantyStatus(calculateDaysUntilExpiry(w.expiryDate)) === 'expiring_soon').length,
    expired: warranties.filter(w => getWarrantyStatus(calculateDaysUntilExpiry(w.expiryDate)) === 'expired').length
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Warranty Tracker</h3>
        </div>
        <span className="text-xs text-white/60">{warranties.length} warranties</span>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-white/70">Active</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.expiring}</div>
          <div className="text-xs text-white/70">Expiring</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
          <div className="text-xs text-white/70">Expired</div>
        </div>
      </div>

      {/* Warranty List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {sortedWarranties.map((warranty) => {
          const daysUntil = calculateDaysUntilExpiry(warranty.expiryDate);
          const status = getWarrantyStatus(daysUntil);
          const statusColor = getStatusColor(status);

          return (
            <div
              key={warranty.id}
              className={`rounded-lg p-4 border ${statusColor} transition-all`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white text-sm">
                        {warranty.equipmentType === 'hvac' ? 'HVAC System' : 'Water Heater'}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        status === 'active' ? 'bg-green-500/30 text-green-400' :
                        status === 'expiring_soon' ? 'bg-yellow-500/30 text-yellow-400' :
                        'bg-red-500/30 text-red-400'
                      }`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="text-xs text-white/70">{warranty.propertyAddress}</div>
                  </div>
                </div>
              </div>

              {/* Equipment Details */}
              <div className="space-y-2 mb-3 bg-black/20 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Manufacturer:</span>
                  <span className="text-white/90 font-medium">{warranty.manufacturer}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Model:</span>
                  <span className="text-white/90 font-medium font-mono">{warranty.model}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Coverage:</span>
                  <span className="text-white/90 font-medium">{warranty.coverageType}</span>
                </div>
              </div>

              {/* Warranty Dates */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Start Date:</span>
                  <span className="text-white/90">{new Date(warranty.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Expiry Date:</span>
                  <span className={`font-semibold ${
                    status === 'expired' ? 'text-red-400' :
                    status === 'expiring_soon' ? 'text-yellow-400' :
                    'text-white/90'
                  }`}>
                    {new Date(warranty.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Days Remaining */}
              <div className="mb-3">
                {status === 'expired' ? (
                  <div className="text-center py-2 px-3 bg-red-500/20 rounded-lg">
                    <div className="text-sm font-semibold text-red-400">
                      Expired {Math.abs(daysUntil)} days ago
                    </div>
                  </div>
                ) : status === 'expiring_soon' ? (
                  <div className="text-center py-2 px-3 bg-yellow-500/20 rounded-lg">
                    <div className="text-sm font-semibold text-yellow-400">
                      Expires in {daysUntil} days!
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 px-3 bg-green-500/20 rounded-lg">
                    <div className="text-sm font-semibold text-green-400">
                      {daysUntil} days remaining
                    </div>
                  </div>
                )}
              </div>

              {/* Document Link */}
              {warranty.documentUrl && (
                <a
                  href={warranty.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-md transition-all flex items-center justify-center gap-2 text-sm text-blue-400 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Warranty Document</span>
                </a>
              )}
            </div>
          );
        })}

        {warranties.length === 0 && (
          <div className="text-center py-8 text-white/60">
            <Shield className="w-12 h-12 mx-auto mb-3 text-white/40" />
            <p>No warranties registered</p>
            <p className="text-xs text-white/40 mt-1">Add your equipment warranties to track coverage</p>
          </div>
        )}
      </div>

      {/* Add Warranty Button */}
      <button className="w-full mt-4 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-all flex items-center justify-center gap-2 text-sm text-purple-400 font-medium">
        <Plus className="w-4 h-4" />
        <span>Add Warranty</span>
      </button>

      {/* Alert for Expiring/Expired */}
      {(stats.expiring > 0 || stats.expired > 0) && (
        <div className="mt-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-400 mb-1">Warranty Attention Required</div>
              <div className="text-xs text-white/70">
                {stats.expired > 0 && `${stats.expired} warranty${stats.expired > 1 ? 'warranties have' : ' has'} expired. `}
                {stats.expiring > 0 && `${stats.expiring} warranty${stats.expiring > 1 ? 'warranties are' : ' is'} expiring soon.`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
