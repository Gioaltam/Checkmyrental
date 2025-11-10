"use client";
import { useState } from "react";
import { ArrowUpDown, Star, AlertTriangle, FileText, Camera } from "lucide-react";

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
}

interface PropertyTableViewProps {
  properties: Property[];
  pinnedProperties: Set<string>;
  onTogglePin: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onOpenPhotos: (property: Property) => void;
  onOpenReports: (property: Property) => void;
  selectedProperties?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  showCheckboxes?: boolean;
}

export default function PropertyTableView({
  properties,
  pinnedProperties,
  onTogglePin,
  onSelectProperty,
  onOpenPhotos,
  onOpenReports,
  selectedProperties,
  onSelect,
  showCheckboxes = false
}: PropertyTableViewProps) {
  const [sortColumn, setSortColumn] = useState<"name" | "status" | "lastInspection" | "issues">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status?: string) => {
    const colors = {
      ok: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      attention: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      critical: "bg-red-500/20 text-red-400 border-red-500/30"
    };
    const labels = { ok: "Healthy", attention: "Attention", critical: "Critical" };
    const validStatus = (status as keyof typeof colors) || "ok";

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[validStatus]}`}>
        {labels[validStatus]}
      </span>
    );
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-white/10 checked:bg-red-500"
                    checked={properties.length > 0 && properties.every(p => selectedProperties?.has(p.id))}
                    onChange={(e) => {
                      properties.forEach(p => onSelect?.(p.id, e.target.checked));
                    }}
                    aria-label="Select all properties"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider w-12">
                <Star className="w-4 h-4" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Property
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  Status
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("lastInspection")}
              >
                <div className="flex items-center gap-2">
                  Last Inspection
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("issues")}
              >
                <div className="flex items-center gap-2">
                  Issues
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Reports
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Photos
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {properties.map((property) => {
              const totalIssues = (property.latestReport?.criticalIssues || 0) + (property.latestReport?.importantIssues || 0);
              const isPinned = pinnedProperties.has(property.id);

              return (
                <tr
                  key={property.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onSelectProperty(property)}
                >
                  {showCheckboxes && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProperties?.has(property.id) || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelect?.(property.id, e.target.checked);
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 checked:bg-red-500"
                        aria-label={`Select ${property.name}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(property.id);
                      }}
                      className="text-white/40 hover:text-yellow-400 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${isPinned ? "fill-yellow-400 text-yellow-400" : ""}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{property.name}</span>
                      <span className="text-sm text-white/60">{property.address}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(property.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80">
                    {property.latestReport?.date
                      ? new Date(property.latestReport.date).toLocaleDateString()
                      : property.lastInspection
                        ? new Date(property.lastInspection).toLocaleDateString()
                        : "N/A"
                    }
                  </td>
                  <td className="px-4 py-3">
                    {totalIssues > 0 ? (
                      <div className="flex items-center gap-2">
                        {property.latestReport?.criticalIssues ? (
                          <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {property.latestReport.criticalIssues}
                          </span>
                        ) : null}
                        {property.latestReport?.importantIssues ? (
                          <span className="text-yellow-400 text-sm font-medium">
                            +{property.latestReport.importantIssues}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-emerald-400 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReports(property);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      {property.reports.length}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPhotos(property);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      {property.photos.length}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProperty(property);
                      }}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
