"use client";
import { Download, FileText, Mail, Trash2, X, Archive } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDownloadReports: () => void;
  onDownloadPhotos: () => void;
  onExportCSV: () => void;
  onEmailSummary: () => void;
  onArchive?: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDownloadReports,
  onDownloadPhotos,
  onExportCSV,
  onEmailSummary,
  onArchive
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="glass-card rounded-2xl shadow-2xl border-2 border-red-500/30 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-white">
              {selectedCount} {selectedCount === 1 ? 'property' : 'properties'} selected
            </span>
          </div>

          {/* Select All/Deselect All */}
          {selectedCount < totalCount ? (
            <button
              onClick={onSelectAll}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium text-white"
              aria-label="Select all properties"
            >
              Select All ({totalCount})
            </button>
          ) : (
            <button
              onClick={onDeselectAll}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium text-white"
              aria-label="Deselect all properties"
            >
              Deselect All
            </button>
          )}

          {/* Divider */}
          <div className="h-8 w-px bg-white/20" />

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadReports}
              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors group"
              title="Download all reports as PDFs"
              aria-label="Download all reports as PDFs"
            >
              <FileText className="w-5 h-5 text-blue-400" />
            </button>

            <button
              onClick={onDownloadPhotos}
              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors group"
              title="Download all photos as ZIP"
              aria-label="Download all photos as ZIP"
            >
              <Download className="w-5 h-5 text-purple-400" />
            </button>

            <button
              onClick={onExportCSV}
              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors group"
              title="Export to CSV"
              aria-label="Export selected properties to CSV"
            >
              <Archive className="w-5 h-5 text-green-400" />
            </button>

            <button
              onClick={onEmailSummary}
              className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors group"
              title="Email summary"
              aria-label="Email summary of selected properties"
            >
              <Mail className="w-5 h-5 text-amber-400" />
            </button>

            {onArchive && (
              <>
                <div className="h-8 w-px bg-white/20" />
                <button
                  onClick={onArchive}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors group"
                  title="Archive selected"
                  aria-label="Archive selected properties"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-white/20" />

          {/* Close */}
          <button
            onClick={onDeselectAll}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close bulk actions"
          >
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-3 text-xs text-white/60 text-center">
          Tip: Use Shift+Click to select a range
        </div>
      </div>
    </div>
  );
}
