"use client";
import { Star, MapPin, Calendar, AlertTriangle, FileText, Camera, Home } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
  lastInspection?: string;
  latestReport?: {
    date: string;
    criticalIssues: number;
    importantIssues: number;
  };
  reports: any[];
  photos: any[];
  coverUrl?: string;
}

interface PropertyCardGridProps {
  properties: Property[];
  pinnedProperties: Set<string>;
  onTogglePin: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  selectedProperties?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  showCheckboxes?: boolean;
}

export default function PropertyCardGrid({
  properties,
  pinnedProperties,
  onTogglePin,
  onSelectProperty,
  selectedProperties,
  onSelect,
  showCheckboxes = false
}: PropertyCardGridProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "critical": return "border-red-500/50 bg-red-500/10";
      case "attention": return "border-amber-500/50 bg-amber-500/10";
      case "ok": return "border-emerald-500/50 bg-emerald-500/10";
      default: return "border-white/10 bg-white/5";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "critical": return "text-red-400";
      case "attention": return "text-amber-400";
      case "ok": return "text-emerald-400";
      default: return "text-white/60";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {properties.map((property) => {
        const isPinned = pinnedProperties.has(property.id);
        const totalIssues = (property.latestReport?.criticalIssues || 0) + (property.latestReport?.importantIssues || 0);

        return (
          <div
            key={property.id}
            className={`glass-card rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-red-500/10 cursor-pointer border-2 ${getStatusColor(property.status)}`}
            onClick={() => onSelectProperty(property)}
          >
            {/* Header with Cover */}
            <div className="relative h-32 bg-gradient-to-br from-red-900/20 to-purple-900/20">
              {property.coverUrl ? (
                <img
                  src={property.coverUrl}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className={`w-12 h-12 ${getStatusIcon(property.status)}`} />
                </div>
              )}
              {/* Checkbox */}
              {showCheckboxes && (
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedProperties?.has(property.id) || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect?.(property.id, e.target.checked);
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-black/50 backdrop-blur-sm checked:bg-red-500"
                    aria-label={`Select ${property.name}`}
                  />
                </div>
              )}
              {/* Pin button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(property.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
              >
                <Star className={`w-4 h-4 ${isPinned ? "fill-yellow-400 text-yellow-400" : "text-white/60"}`} />
              </button>
              {/* Status badge */}
              <div className="absolute bottom-2 left-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                  property.status === "critical"
                    ? "bg-red-500/80 text-white border-red-400"
                    : property.status === "attention"
                      ? "bg-amber-500/80 text-black border-amber-400"
                      : "bg-emerald-500/80 text-white border-emerald-400"
                }`}>
                  {property.status === "critical" ? "Critical" : property.status === "attention" ? "Attention" : "Healthy"}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Name */}
              <div>
                <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                  {property.name}
                  {property.latestReport && property.latestReport.criticalIssues > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {property.latestReport.criticalIssues}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1 text-sm text-white/60 mt-1">
                  <MapPin className="w-3 h-3" />
                  {property.address}
                </div>
              </div>

              {/* Last Inspection */}
              {property.latestReport && (
                <div className="flex items-center gap-1 text-sm text-white/60">
                  <Calendar className="w-3 h-3" />
                  Last inspected {new Date(property.latestReport.date).toLocaleDateString()}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-blue-400">
                    <FileText className="w-3 h-3" />
                    <span>{property.reports.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-400">
                    <Camera className="w-3 h-3" />
                    <span>{property.photos.length}</span>
                  </div>
                </div>
                {totalIssues > 0 ? (
                  <div className="flex items-center gap-1 text-sm">
                    {property.latestReport?.criticalIssues ? (
                      <span className="text-red-400 font-medium">
                        {property.latestReport.criticalIssues} critical
                      </span>
                    ) : null}
                    {property.latestReport?.importantIssues ? (
                      <span className="text-yellow-400">
                        +{property.latestReport.importantIssues}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-emerald-400 text-sm font-medium">No issues</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
