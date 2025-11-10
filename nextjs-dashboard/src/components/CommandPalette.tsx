"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Home, FileText, Camera, Settings, TrendingUp, AlertTriangle, Calendar, ArrowRight, Clock } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
}

interface Report {
  id: string;
  date: string;
  property: string;
  criticalIssues: number;
  importantIssues: number;
}

interface CommandPaletteProps {
  properties: Property[];
  reports: Report[];
  onNavigate: (tab: string) => void;
  onOpenReport: (reportId: string) => void;
  onOpenProperty: (propertyId: string) => void;
}

type SearchResult = {
  id: string;
  type: "navigation" | "property" | "report" | "action";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
};

export default function CommandPalette({
  properties,
  reports,
  onNavigate,
  onOpenReport,
  onOpenProperty
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Quick actions and navigation
  const getQuickActions = (): SearchResult[] => {
    const criticalReports = reports.filter(r => r.criticalIssues > 0);

    return [
      {
        id: "nav-dashboard",
        type: "navigation",
        title: "Go to Dashboard",
        icon: <Home className="w-4 h-4" />,
        action: () => { onNavigate("overview"); setIsOpen(false); }
      },
      {
        id: "nav-properties",
        type: "navigation",
        title: "Go to Properties",
        icon: <Home className="w-4 h-4" />,
        action: () => { onNavigate("properties"); setIsOpen(false); }
      },
      {
        id: "nav-analytics",
        type: "navigation",
        title: "Go to Analytics",
        icon: <TrendingUp className="w-4 h-4" />,
        action: () => { onNavigate("analytics"); setIsOpen(false); }
      },
      {
        id: "nav-settings",
        type: "navigation",
        title: "Go to Settings",
        icon: <Settings className="w-4 h-4" />,
        action: () => { window.location.href = "/settings"; setIsOpen(false); }
      },
      ...(criticalReports.length > 0 ? [{
        id: "action-critical",
        type: "action" as const,
        title: "View Critical Issues",
        subtitle: `${criticalReports.length} properties need attention`,
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
        action: () => { onNavigate("properties"); setIsOpen(false); }
      }] : [])
    ];
  };

  const getSearchResults = useCallback((): SearchResult[] => {
    if (!query.trim()) {
      return getQuickActions();
    }

    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search properties
    properties.forEach(prop => {
      if (
        prop.name.toLowerCase().includes(searchTerm) ||
        prop.address.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          id: `prop-${prop.id}`,
          type: "property",
          title: prop.name,
          subtitle: prop.address,
          icon: <Home className={`w-4 h-4 ${
            prop.status === "critical" ? "text-red-400" :
            prop.status === "attention" ? "text-yellow-400" :
            "text-green-400"
          }`} />,
          action: () => {
            onOpenProperty(prop.id);
            setIsOpen(false);
          }
        });
      }
    });

    // Search reports
    reports.forEach(report => {
      const reportDate = new Date(report.date).toLocaleDateString();
      if (
        report.property.toLowerCase().includes(searchTerm) ||
        reportDate.includes(searchTerm) ||
        report.id.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          id: `report-${report.id}`,
          type: "report",
          title: `${report.property} - ${reportDate}`,
          subtitle: report.criticalIssues > 0
            ? `${report.criticalIssues} critical, ${report.importantIssues} important`
            : `${report.importantIssues} important issues`,
          icon: <FileText className="w-4 h-4" />,
          action: () => {
            onOpenReport(report.id);
            setIsOpen(false);
          }
        });
      }
    });

    // Search actions based on keywords
    if (searchTerm.includes("critical") || searchTerm.includes("urgent")) {
      const criticalReports = reports.filter(r => r.criticalIssues > 0);
      if (criticalReports.length > 0) {
        results.unshift({
          id: "action-critical-search",
          type: "action",
          title: "View All Critical Issues",
          subtitle: `Found ${criticalReports.length} critical issues`,
          icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
          action: () => { onNavigate("properties"); setIsOpen(false); }
        });
      }
    }

    return results.slice(0, 8); // Limit to 8 results
  }, [query, properties, reports, onNavigate, onOpenProperty, onOpenReport]);

  const results = getSearchResults();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery("");
        setSelectedIndex(0);
      }

      // ESC to close
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }

      // Arrow navigation when open
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        }
        if (e.key === "Enter" && results[selectedIndex]) {
          e.preventDefault();
          results[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[rgb(20,20,20)] rounded-xl shadow-2xl shadow-red-500/20 border border-white/10 overflow-hidden animate-in slide-in-from-top-4 duration-300">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties, reports, or type a command..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-base"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/40">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {/* Group by type */}
              {query.trim() === "" && (
                <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Quick Actions
                </div>
              )}

              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    selectedIndex === index
                      ? "bg-red-500/20 border-l-2 border-red-500"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedIndex === index ? "bg-red-500/20" : "bg-white/10"
                  }`}>
                    {result.icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-white/60 truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  {selectedIndex === index && (
                    <ArrowRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">⌘K</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
