"use client";
import { useState } from "react";
import { Home, MapPin, Calendar, AlertTriangle, Camera, Wrench, ChevronDown, FileText, Filter } from "lucide-react";
import QuickActionsMenu from "./QuickActionsMenu";
import ReportPreviewTooltip from "./ReportPreviewTooltip";

interface Report {
  id: string;
  date: string;
  property: string;
  inspector: string;
  status: string;
  criticalIssues: number;
  importantIssues: number;
  totalPhotos?: number;
  reportUrl?: string;
  pdfPath?: string;
}

interface Photo {
  url: string;
  reportId?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
  lastInspection?: string;
  coverUrl?: string;
  reports: Report[];
  latestReport?: Report;
  photos: Photo[];
}

interface PropertyAccordionProps {
  property: Property;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenReport: (report: Report) => void;
  onOpenPhotos: () => void;
  onOpenHVAC: () => void;
  selectedYear: string;
  selectedQuarter: string;
  onYearChange: (year: string) => void;
  onQuarterChange: (quarter: string) => void;
  showAllReports: boolean;
  onToggleReports: () => void;
  isPinned?: boolean;
  onPin?: () => void;
  isSelected?: boolean;
  onSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCheckbox?: boolean;
}

export default function PropertyAccordion({
  property,
  isExpanded,
  onToggle,
  onOpenReport,
  onOpenPhotos,
  onOpenHVAC,
  selectedYear,
  selectedQuarter,
  onYearChange,
  onQuarterChange,
  showAllReports,
  onToggleReports,
  isPinned = false,
  onPin,
  isSelected = false,
  onSelect,
  showCheckbox = false
}: PropertyAccordionProps) {

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "critical": return "bg-red-500";
      case "attention": return "bg-amber-400";
      case "ok": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "critical": return "Critical";
      case "attention": return "Needs Attention";
      case "ok": return "Healthy";
      default: return "Unknown";
    }
  };

  return (
    <div
      className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
      role="article"
      aria-label={`Property: ${property.name}`}
    >
      {/* Compact Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 md:p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-all group touch-manipulation min-h-[60px] sm:min-h-[80px]"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${property.name} at ${property.address}`}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Selection Checkbox */}
          {showCheckbox && onSelect && (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-red-500 checked:border-red-500 cursor-pointer focus:ring-2 focus:ring-red-500/50 transition-all"
                aria-label={`Select ${property.name}`}
              />
            </div>
          )}

          {/* Property Icon with Status Ring */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-full ${getStatusColor(property.status)} bg-opacity-20 flex items-center justify-center ring-2 ${
              property.status === "critical" ? "ring-red-500/50" :
              property.status === "attention" ? "ring-amber-400/50" :
              "ring-emerald-500/50"
            }`}>
              <Home className={`w-6 h-6 ${
                property.status === "critical" ? "text-red-400" :
                property.status === "attention" ? "text-amber-400" :
                "text-emerald-400"
              }`} />
            </div>
            {/* Status dot */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(property.status)} ring-2 ring-black`}></div>
          </div>

          {/* Property Info */}
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold flex items-center gap-2 group-hover:text-red-400 transition-colors">
              {property.name}
              {property.latestReport && property.latestReport.criticalIssues > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {property.latestReport.criticalIssues}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.address}
              </div>
              {property.latestReport && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(property.latestReport.date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Inline Photo Previews - Only show when collapsed */}
          {!isExpanded && property.photos && property.photos.length > 0 && (
            <div className="flex items-center gap-1 mr-3">
              {property.photos.slice(0, 4).map((photo, idx) => (
                <div
                  key={idx}
                  className="relative group/thumb"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotos();
                  }}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/10 hover:border-purple-400/50 transition-all hover:scale-110 hover:z-10 cursor-pointer">
                    <img
                      src={photo.url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none z-20">
                    Click to view all photos
                  </div>
                  {/* +X overlay for last thumbnail */}
                  {idx === 3 && property.photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-sm rounded-lg">
                      +{property.photos.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-sm">
            <div className="text-center">
              <div className="text-white/40 text-xs">Reports</div>
              <div className="font-semibold">{property.reports?.length || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-white/40 text-xs">Photos</div>
              <div className="font-semibold">{property.photos?.length || 0}</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              property.status === "critical" ? "bg-red-500 text-white" :
              property.status === "attention" ? "bg-amber-400 text-black" :
              "bg-emerald-500 text-white"
            }`}>
              {getStatusText(property.status)}
            </div>
          </div>

          {/* Quick Actions Menu */}
          <QuickActionsMenu
            property={property}
            isPinned={isPinned}
            onPin={onPin}
            onDownloadReports={() => {
              // Download all reports as PDFs
              property.reports.forEach(report => {
                if (report.pdfPath) {
                  window.open(report.pdfPath, '_blank');
                }
              });
            }}
            onDownloadPhotos={() => {
              // Download all photos (this would typically create a ZIP)
              console.log('Download all photos for', property.address);
              alert(`Downloading ${property.photos.length} photos for ${property.name}...`);
            }}
            onSetNickname={() => {
              const nickname = prompt(`Set a nickname for ${property.address}:`, property.name);
              if (nickname) {
                console.log('Set nickname:', nickname);
                alert(`Nickname "${nickname}" will be saved for ${property.address}`);
              }
            }}
            onShare={() => {
              const url = `${window.location.origin}/property/${property.id}`;
              navigator.clipboard.writeText(url);
              alert('Property link copied to clipboard!');
            }}
            onViewHistory={() => {
              console.log('View history for', property.address);
              alert('Maintenance history feature coming soon!');
            }}
          />

          {/* Expand Icon */}
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} group-hover:text-red-400`} />
        </div>
      </button>

      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 pt-0 space-y-4 border-t border-white/10">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Property actions">
            <button
              onClick={onOpenHVAC}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all flex items-center gap-2 text-sm font-medium hover:scale-105 transform"
              aria-label={`Open HVAC maintenance for ${property.address}`}
            >
              <Wrench className="w-4 h-4" aria-hidden="true" />
              HVAC Maintenance
            </button>
            {property.photos && property.photos.length > 0 && (
              <button
                onClick={onOpenPhotos}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all flex items-center gap-2 text-sm font-medium hover:scale-105 transform"
                aria-label={`View ${property.photos.length} photos for ${property.address}`}
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                View {property.photos.length} Photos
              </button>
            )}
          </div>

          {/* Photo Grid Preview (4 photos) */}
          {property.photos && property.photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {property.photos.slice(0, 4).map((photo, idx) => (
                <div
                  key={idx}
                  onClick={onOpenPhotos}
                  className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:z-10"
                >
                  <img
                    src={photo.url}
                    alt={`${property.address} - Photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  {idx === 3 && property.photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white text-lg font-semibold">+{property.photos.length - 4}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs">Click to view</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reports Section */}
          {property.reports && property.reports.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/60" />
                  <p className="text-sm font-semibold text-white/80">Inspection Reports ({property.reports.length})</p>
                </div>
                {property.reports.length > 3 && (
                  <button
                    onClick={onToggleReports}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-sm group"
                  >
                    <Filter className="w-3 h-3" />
                    {showAllReports ? 'Show Less' : `View All (${property.reports.length})`}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showAllReports ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Quick Access - Latest 3 Reports */}
              {!showAllReports && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {property.reports.slice(0, 3).map((report) => {
                    const date = new Date(report.date);
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    return (
                      <ReportPreviewTooltip key={report.id} report={report}>
                        <button
                          onClick={() => onOpenReport(report)}
                          className="glass-card rounded-lg p-3 hover:bg-white/10 transition-all text-left group hover:scale-[1.02] transform w-full"
                        >
                        <div className="text-xs text-white/40 mb-1">Q{quarter} {date.getFullYear()}</div>
                        <div className="font-semibold text-sm group-hover:text-red-400 transition-colors">
                          {date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {report.criticalIssues > 0 && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {report.criticalIssues}
                            </span>
                          )}
                          {report.importantIssues > 0 && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                              {report.importantIssues}
                            </span>
                          )}
                        </div>
                      </button>
                      </ReportPreviewTooltip>
                    );
                  })}
                </div>
              )}

              {/* Expanded Reports View */}
              {showAllReports && (
                <div className="space-y-3">
                  {/* Year and Quarter Filters */}
                  <div className="flex gap-2 flex-wrap">
                    <select
                      aria-label="Filter reports by year"
                      value={selectedYear}
                      onChange={(e) => onYearChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-red-400 transition-all"
                    >
                      <option value="all">All Years</option>
                      {Array.from(new Set(property.reports.map(r => new Date(r.date).getFullYear())))
                        .sort((a, b) => b - a)
                        .map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select
                      aria-label="Filter reports by quarter"
                      value={selectedQuarter}
                      onChange={(e) => onQuarterChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-red-400 transition-all"
                    >
                      <option value="all">All Quarters</option>
                      <option value="1">Q1 (Jan-Mar)</option>
                      <option value="2">Q2 (Apr-Jun)</option>
                      <option value="3">Q3 (Jul-Sep)</option>
                      <option value="4">Q4 (Oct-Dec)</option>
                    </select>
                  </div>

                  {/* Filtered Reports Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {property.reports
                      .filter(report => {
                        const date = new Date(report.date);
                        const year = date.getFullYear();
                        const quarter = Math.floor(date.getMonth() / 3) + 1;

                        if (selectedYear !== "all" && year !== parseInt(selectedYear)) return false;
                        if (selectedQuarter !== "all" && quarter !== parseInt(selectedQuarter)) return false;
                        return true;
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((report) => {
                        const date = new Date(report.date);
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                        return (
                          <ReportPreviewTooltip key={report.id} report={report}>
                            <div
                              onClick={() => onOpenReport(report)}
                              className="glass-card rounded-lg p-3 hover:bg-white/10 cursor-pointer transition-all hover:scale-105 transform"
                            >
                            <div className="text-xs text-white/40 mb-1">Q{quarter} {date.getFullYear()}</div>
                            <div className="font-semibold text-sm">{monthNames[date.getMonth()]} {date.getDate()}</div>
                            <div className="flex flex-col gap-1 mt-2">
                              {report.criticalIssues > 0 && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                  {report.criticalIssues} critical
                                </span>
                              )}
                              {report.importantIssues > 0 && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                                  {report.importantIssues} important
                                </span>
                              )}
                            </div>
                          </div>
                          </ReportPreviewTooltip>
                        );
                      })}
                  </div>

                  {/* No Results Message */}
                  {property.reports.filter(report => {
                    const date = new Date(report.date);
                    const year = date.getFullYear();
                    const quarter = Math.floor(date.getMonth() / 3) + 1;

                    if (selectedYear !== "all" && year !== parseInt(selectedYear)) return false;
                    if (selectedQuarter !== "all" && quarter !== parseInt(selectedQuarter)) return false;
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-4 text-white/40 text-sm">
                      No reports found for the selected period
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
