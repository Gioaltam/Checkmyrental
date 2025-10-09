"use client";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Bell, Search, Menu, LogOut, Building2, Images, FileText, Settings, Home, AlertTriangle, Camera, X, Wrench, Filter, ChevronDown, ZoomIn, Info, Lightbulb, Loader2, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import HVACMaintenanceModal from "@/components/HVACMaintenanceModal";
import MetricCard from "@/components/MetricCard";
import FloatingParticles from "@/components/FloatingParticles";
import ThemeToggle from "@/components/ThemeToggle";
import EquipmentInventory from "@/components/EquipmentInventory";
import PropertyAccordion from "@/components/PropertyAccordion";
import HealthScoreWidget from "@/components/HealthScoreWidget";
import CollapsibleSection from "@/components/CollapsibleSection";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import CommandPalette from "@/components/CommandPalette";
import QuickActions from "@/components/QuickActions";
import AIChatAssistant from "@/components/AIChatAssistant";
import OnboardingTour from "@/components/OnboardingTour";
import MobileNav from "@/components/MobileNav";
import NotificationCenter from "@/components/NotificationCenter";
import ScheduleManager from "@/components/ScheduleManager";

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [active, setActive] = useState("all");
  const [propertiesView, setPropertiesView] = useState<"grouped" | "reports">("grouped");
  const [loading, setLoading] = useState(true);
  const [propsData, setPropsData] = useState<Property[]>([]);
  const [userName, setUserName] = useState("Loading...");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPhotoGrid, setShowPhotoGrid] = useState(false);
  const [showHVACModal, setShowHVACModal] = useState(false);
  const [hvacPropertyAddress, setHvacPropertyAddress] = useState<string>("");
  const [properties, setProperties] = useState<Map<string, Property>>(new Map());
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<Record<string, any>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"30d" | "90d" | "6m" | "1y" | "all">("6m");
  const [analyticsPropertyFilter, setAnalyticsPropertyFilter] = useState<string>("all");
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "critical" as const,
      title: "Critical Issue Detected",
      message: "HVAC system failure reported at Oak Manor property",
      time: "5 minutes ago",
      read: false,
      actionLabel: "View Details",
      onAction: () => {
        setActiveTab("properties");
        setActive("critical");
        setShowNotifications(false);
      }
    },
    {
      id: "2",
      type: "warning" as const,
      title: "Inspection Due Soon",
      message: "Quarterly inspection for Sunset Villa scheduled in 3 days",
      time: "2 hours ago",
      read: false
    },
    {
      id: "3",
      type: "success" as const,
      title: "Report Completed",
      message: "Q3 2024 maintenance report for Pine Street is now available",
      time: "1 day ago",
      read: true,
      actionLabel: "View Report",
      onAction: () => {
        setActiveTab("properties");
        setPropertiesView("reports");
        setShowNotifications(false);
      }
    }
  ]);

  // Analytics calculations
  const calculateAnalytics = () => {
    const now = new Date();
    const cutoffDate = new Date();

    // Set cutoff date based on timeframe
    switch(analyticsTimeframe) {
      case "30d": cutoffDate.setDate(now.getDate() - 30); break;
      case "90d": cutoffDate.setDate(now.getDate() - 90); break;
      case "6m": cutoffDate.setMonth(now.getMonth() - 6); break;
      case "1y": cutoffDate.setFullYear(now.getFullYear() - 1); break;
      case "all": cutoffDate.setFullYear(2000); break;
    }

    // Filter reports by timeframe and property
    const filteredReports = propsData.flatMap(prop =>
      prop.reports.filter(r => {
        const reportDate = new Date(r.date);
        const matchesTimeframe = reportDate >= cutoffDate;
        const matchesProperty = analyticsPropertyFilter === "all" || prop.address === analyticsPropertyFilter;
        return matchesTimeframe && matchesProperty;
      }).map(r => ({ ...r, propertyAddress: prop.address }))
    );

    const totalCritical = filteredReports.reduce((sum, r) => sum + (r.criticalIssues || 0), 0);
    const totalImportant = filteredReports.reduce((sum, r) => sum + (r.importantIssues || 0), 0);
    const totalIssues = totalCritical + totalImportant;

    const propertiesWithCritical = new Set(
      filteredReports.filter(r => r.criticalIssues > 0).map(r => r.propertyAddress)
    ).size;

    const avgIssuesPerProperty = propsData.length > 0
      ? (totalIssues / propsData.length).toFixed(1)
      : "0";

    // Issue trends by month
    const issuesByMonth: { [key: string]: { critical: number; important: number } } = {};
    filteredReports.forEach(report => {
      const monthKey = new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!issuesByMonth[monthKey]) {
        issuesByMonth[monthKey] = { critical: 0, important: 0 };
      }
      issuesByMonth[monthKey].critical += report.criticalIssues || 0;
      issuesByMonth[monthKey].important += report.importantIssues || 0;
    });

    return {
      totalIssues,
      totalCritical,
      totalImportant,
      propertiesWithCritical,
      avgIssuesPerProperty,
      totalInspections: filteredReports.length,
      issuesByMonth,
      reportsInTimeframe: filteredReports
    };
  };

  const analytics = calculateAnalytics();

  // Function to fetch photo analysis
  const fetchPhotoAnalysis = async (photoUrl: string, reportId?: string) => {
    const photoKey = `${photoUrl}-${reportId}`;
    
    // Return cached analysis if available
    if (photoAnalysis[photoKey]) {
      return photoAnalysis[photoKey];
    }
    
    setLoadingAnalysis(photoKey);
    
    try {
      if (!reportId) {
        throw new Error("No report ID available for this photo");
      }
      
      // Extract filename from URL
      const photoFilename = photoUrl.split('/').pop();
      
      // Call the actual backend API
      const response = await fetch(`${API_BASE}/api/photo-report/${reportId}/${photoFilename}/json`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch analysis");
      }
      
      const analysisData = await response.json();
      
      // Check if it's an error response
      if (analysisData.error) {
        throw new Error(analysisData.error);
      }
      
      // Use the actual analysis data from the API
      const actualAnalysis = {
        location: analysisData.location,
        severity: analysisData.severity,
        observations: analysisData.observations || [],
        potentialIssues: analysisData.potential_issues || [],
        recommendations: analysisData.recommendations || [],
        note: analysisData.note
      };
      
      setPhotoAnalysis(prev => ({
        ...prev,
        [photoKey]: actualAnalysis
      }));
      
      return actualAnalysis;
    } catch (error) {
      console.error('Failed to fetch photo analysis:', error);
      // Store error state for this photo
      const errorAnalysis = {
        error: true,
        message: error instanceof Error ? error.message : 'Failed to load analysis',
        severity: 'error',
        observations: [],
        potentialIssues: [],
        recommendations: []
      };
      setPhotoAnalysis(prev => ({
        ...prev,
        [photoKey]: errorAnalysis
      }));
      return errorAnalysis;
    } finally {
      setLoadingAnalysis(null);
    }
  };

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Get owner ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || "";
    const useMock = urlParams.get("mock") === "true" || !token;

    // If mock=true or no token, load mock data directly
    if (useMock) {
      console.log("Loading mock data...");
      fetch('/mock-data.json')
        .then(res => res.json())
        .then(mockData => {
          setUserName(mockData.owner);
          handleReportsData({ reports: mockData.reports });
        })
        .catch(err => console.error("Failed to load mock data:", err));
      return;
    }

    // First try to get dashboard data with owner info
    fetch(`${API_BASE}/api/owners/dashboard?portal_token=${token}`)
      .then(res => res.json())
      .then(dashboardData => {
        console.log("Dashboard data:", dashboardData);
        if (dashboardData.owner) {
          setUserName(dashboardData.owner);
        } else if (dashboardData.full_name) {
          setUserName(dashboardData.full_name);
        } else if (dashboardData.email) {
          // Use email as fallback
          setUserName(dashboardData.email.split('@')[0]);
        }

        // The new API returns properties directly, so use that data
        if (dashboardData.properties) {
          handleDashboardData(dashboardData);
          return null; // Don't need to fetch reports separately
        }

        // Fallback: If we got a client ID, use it for fetching reports
        if (dashboardData.client_id) {
          return dashboardData.client_id;
        }
        return token;
      })
      .then(effectiveToken => {
        // Only fetch reports if we didn't get properties from dashboard
        if (!effectiveToken) return { reports: [] };
        return fetch(`${API_BASE}/api/reports/list?owner_id=${effectiveToken}`).then(res => res.json());
      })
      .then(async data => {
        if (data && data.reports && data.reports.length > 0) {
          handleReportsData(data);
        }
      })
      .catch(err => {
        console.log("Could not fetch from backend, loading mock data:", err);
        // Load mock data as fallback
        fetch('/mock-data.json')
          .then(res => res.json())
          .then(mockData => {
            setUserName(mockData.owner);
            handleReportsData({ reports: mockData.reports });
          })
          .catch(err => console.error("Failed to load mock data:", err));
      });
  }, []);

  const handleDashboardData = async (dashboardData: any) => {
    // Convert dashboard API format to properties format
    if (!dashboardData.properties || dashboardData.properties.length === 0) {
      setPropsData([]);
      setLoading(false);
      return;
    }

    const properties: Property[] = [];

    for (const prop of dashboardData.properties) {
      const property: Property = {
        id: prop.id || prop.address.replace(/\s+/g, '-').toLowerCase(),
        name: prop.address.split(",")[0] || prop.address,
        address: prop.address,
        reports: [],
        photos: [],
        lastInspection: prop.lastInspection,
        status: "ok"
      };

      // Add reports
      if (prop.reports && prop.reports.length > 0) {
        property.reports = prop.reports.map((r: any) => ({
          id: r.id,
          date: r.date,
          property: prop.address,
          inspector: r.inspector || "Inspection Agent",
          status: r.status || "completed",
          criticalIssues: r.criticalIssues || 0,
          importantIssues: r.importantIssues || 0,
          totalPhotos: 0
        }));

        // Set latest report
        property.latestReport = property.reports[0];

        // Set status based on latest report
        const latest = property.latestReport;
        property.status = latest.criticalIssues > 0 ? "critical" : latest.importantIssues > 0 ? "attention" : "ok";
      }

      // Fetch photos for this property
      try {
        const photosRes = await fetch(`${API_BASE}/api/photos/property/${encodeURIComponent(prop.address)}`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          const photoItems = photosData.items || photosData.photos || [];

          if (photoItems.length > 0) {
            property.photos = photoItems.map((p: any) => {
              const photoUrl = p.url.startsWith('http') ? p.url : `${API_BASE}${p.url}`;
              // Use report_id from the photo item, or fall back to the overall report_id from response
              const reportId = p.report_id || photosData.report_id || property.latestReport?.id;

              return {
                url: photoUrl,
                reportId: reportId
              };
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch photos for ${prop.address}:`, err);
      }

      properties.push(property);
    }

    setPropsData(properties);
    setLoading(false);
  };

  const handleReportsData = async (data: any) => {
    if (data.reports) {
          // Group reports by property
          const propertyMap = new Map<string, Property>();
          
          data.reports.forEach((report: Report) => {
            if (!propertyMap.has(report.property)) {
              propertyMap.set(report.property, {
                id: report.property.replace(/\s+/g, '-').toLowerCase(),
                name: report.property.split(",")[0] || report.property,
                address: report.property,
                reports: [],
                photos: []
              });
            }
            
            const property = propertyMap.get(report.property)!;
            property.reports.push(report);
            
            // Set latest report
            if (!property.latestReport || new Date(report.date) > new Date(property.latestReport.date)) {
              property.latestReport = report;
            }
            
            // Set status based on latest report
            property.status = report.criticalIssues > 0 ? "critical" : report.importantIssues > 0 ? "attention" : "ok";
            property.lastInspection = report.date;
          });
          
          // Fetch photos for each property
          for (const [address, property] of propertyMap) {
            try {
              const photosRes = await fetch(`${API_BASE}/api/photos/property/${encodeURIComponent(address)}`);
              if (photosRes.ok) {
                const photosData = await photosRes.json();

                // Handle both 'photos' and 'items' response formats
                const photoItems = photosData.items || photosData.photos || [];

                if (photoItems.length > 0) {
                  property.photos = photoItems.map((p: any) => {
                    // Build full URL for photo
                    const photoUrl = p.url.startsWith('http') ? p.url : `${API_BASE}${p.url}`;

                    // Extract report ID if needed
                    const urlParts = p.url.split('/');
                    const extractedReportId = urlParts[4] || property.latestReport?.id;

                    return {
                      url: photoUrl,
                      reportId: p.reportId || extractedReportId
                    };
                  });
                }
              }
            } catch (err) {
              console.error(`Failed to fetch photos for ${address}:`, err);
            }

            // No fallback images - show empty state if no photos
            if (property.photos.length === 0) {
              // Keep empty array to show "No photos" message in UI
              property.photos = [];
            }
            
            // Set cover URL to first photo
            property.coverUrl = property.photos[0]?.url;
          }
          
      setProperties(propertyMap);
      setPropsData(Array.from(propertyMap.values()));
    }
    setLoading(false);
  };

  const openReport = async (report: Report) => {
    setSelectedReport(report);
    setLoadingReport(true);
    
    // Fetch the report content
    try {
      const response = await fetch(`${API_BASE}/api/simple/simple/${report.id}`);
      const html = await response.text();
      setReportContent(html);
    } catch (error) {
      console.error("Failed to load report:", error);
      setReportContent("<h1>Failed to load report</h1>");
    }
    setLoadingReport(false);
  };

  const filtered = propsData.filter((p) => {
    if (active === "all") return true;
    if (active === "healthy") return p.status === "ok";
    if (active === "attention") return p.status === "attention";
    if (active === "critical") return p.status === "critical";
    return true;
  });

  return (
    <div className="grid md:grid-cols-[250px_1fr] min-h-screen bg-[rgb(10,10,10)] relative">
      {/* Floating Particles Background */}
      <FloatingParticles />

      {/* Sidebar - Executive Premium Design */}
      <aside className="hidden md:flex flex-col border-r border-white/10 bg-black/80 light-mode:bg-blue-50 sticky top-0 h-screen z-10 sidebar-light-blue relative overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(100,120,150,0.03)] via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(59,130,246,0.05)] rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo Section - Executive Premium */}
        <div className="px-6 py-7 border-b border-white/10 relative">
          <div className="relative">
            {/* Glowing effect behind logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(231,76,60,0.2)] to-[rgba(231,76,60,0.05)] rounded-2xl blur-xl"></div>

            <div className="relative bg-gradient-to-br from-[rgba(231,76,60,0.18)] via-[rgba(231,76,60,0.12)] to-[rgba(231,76,60,0.08)] rounded-2xl px-5 py-4 border-2 border-[rgba(231,76,60,0.3)] shadow-2xl shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-300 group backdrop-blur-sm">
              {/* Inner shine effect */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl"></div>

              <div className="relative font-black tracking-tight text-2xl group-hover:scale-[1.02] transition-transform w-full flex justify-center">
                <span className="text-white drop-shadow-lg">Check</span>
                <span className="text-white/95 drop-shadow-lg">My</span>
                <span className="text-[rgb(231,76,60)] drop-shadow-[0_2px_12px_rgba(231,76,60,0.6)]">Rental</span>
              </div>
              <div className="text-xs text-white/70 mt-2 font-semibold uppercase tracking-widest text-center">Owner Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 text-sm relative">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border font-semibold relative transition-all duration-200 group ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-[rgba(59,130,246,0.2)] to-[rgba(59,130,246,0.1)] text-[rgb(59,130,246)] border-[rgba(59,130,246,0.3)] shadow-lg shadow-blue-500/20 scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5 border-transparent hover:border-[rgba(100,120,150,0.15)] hover:scale-[1.01]"
            }`}
          >
            {activeTab === "overview" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[rgb(59,130,246)] to-[rgb(37,99,235)] rounded-r-full"></div>
            )}
            <Home className={`w-5 h-5 transition-transform ${activeTab === "overview" ? "" : "group-hover:scale-110"}`} />
            <span className="flex-1 text-left">Dashboard</span>
            {activeTab === "overview" && (
              <span className="bg-[rgb(59,130,246)] text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-lg">
                3
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("properties")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border font-semibold relative transition-all duration-200 group ${
              activeTab === "properties"
                ? "bg-gradient-to-r from-[rgba(59,130,246,0.2)] to-[rgba(59,130,246,0.1)] text-[rgb(59,130,246)] border-[rgba(59,130,246,0.3)] shadow-lg shadow-blue-500/20 scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5 border-transparent hover:border-[rgba(100,120,150,0.15)] hover:scale-[1.01]"
            }`}
          >
            {activeTab === "properties" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[rgb(59,130,246)] to-[rgb(37,99,235)] rounded-r-full"></div>
            )}
            <Building2 className={`w-5 h-5 transition-transform ${activeTab === "properties" ? "" : "group-hover:scale-110"}`} />
            <span className="flex-1 text-left">Properties & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border font-semibold relative transition-all duration-200 group ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-[rgba(59,130,246,0.2)] to-[rgba(59,130,246,0.1)] text-[rgb(59,130,246)] border-[rgba(59,130,246,0.3)] shadow-lg shadow-blue-500/20 scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5 border-transparent hover:border-[rgba(100,120,150,0.15)] hover:scale-[1.01]"
            }`}
          >
            {activeTab === "analytics" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[rgb(59,130,246)] to-[rgb(37,99,235)] rounded-r-full"></div>
            )}
            <svg className={`w-5 h-5 transition-transform ${activeTab === "analytics" ? "" : "group-hover:scale-110"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="flex-1 text-left">Analytics</span>
          </button>

          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-[rgba(100,120,150,0.15)] transition-all duration-200 group hover:scale-[1.01]">
            <Settings className="w-5 h-5 group-hover:scale-110 group-hover:rotate-45 transition-all" />
            <span className="flex-1 text-left">Settings</span>
          </Link>
        </nav>

        {/* Sign Out Section */}
        <div className="mt-auto p-4 border-t border-white/10">
          <button
            onClick={() => (window.location.href = API_BASE)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white/[0.08] to-white/[0.05] hover:from-red-500/20 hover:to-red-500/10 px-4 py-3 text-white/80 hover:text-white border border-white/10 hover:border-red-500/30 transition-all duration-200 font-medium group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl py-4 header-light-blue">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button aria-label="Toggle navigation menu" className="md:hidden text-white/80">
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <span>{userName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <button
                  onClick={() => setShowNotifications(true)}
                  aria-label="View notifications"
                  className="relative p-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Bell className="w-5 h-5 text-white/80" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => setShowCommandPalette(true)}
                  aria-label="Open search"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                >
                  <Search className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                  <span className="text-xs text-white/60 group-hover:text-white/80">Search</span>
                  <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-white/10 rounded text-xs text-white/40">⌘K</kbd>
                </button>
                <button
                  onClick={() => setShowCommandPalette(true)}
                  aria-label="Open search"
                  className="md:hidden p-2 rounded-lg hover:bg-white/5"
                >
                  <Search className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 pb-16 pt-10 relative z-10">
          <div className="max-w-screen-2xl mx-auto px-6 md:px-10 space-y-12">
            {/* Page Header - Enhanced with decorative frame */}
            <header className="relative space-y-4 pb-6 px-6 py-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-sm shadow-xl">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[rgb(59,130,246)] rounded-tl-2xl opacity-40"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[rgb(59,130,246)] rounded-br-2xl opacity-40"></div>

              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[rgb(59,130,246)] to-transparent rounded-t-2xl opacity-60"></div>

              <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
                <div className="space-y-3 flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight flex items-center gap-3">
                    {activeTab === "overview" && (
                      <>
                        <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(59,130,246)] to-[rgb(37,99,235)] shadow-lg shadow-blue-500/30">
                          <Home className="w-6 h-6 text-white" />
                        </span>
                        Dashboard
                      </>
                    )}
                    {activeTab === "properties" && (
                      <>
                        <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(59,130,246)] to-[rgb(37,99,235)] shadow-lg shadow-blue-500/30">
                          <Building2 className="w-6 h-6 text-white" />
                        </span>
                        Properties & Reports
                      </>
                    )}
                    {activeTab === "analytics" && (
                      <>
                        <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(59,130,246)] to-[rgb(37,99,235)] shadow-lg shadow-blue-500/30">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </span>
                        Analytics
                      </>
                    )}
                  </h1>
                  <p className="text-lg text-white/60 font-normal max-w-2xl leading-relaxed">
                    {activeTab === "overview" && "Monitor your rental properties and inspection reports"}
                    {activeTab === "properties" && "Manage properties, view photos, and access all inspection reports"}
                    {activeTab === "analytics" && "Track performance, trends, and property health over time"}
                  </p>
                </div>
              </div>
            </header>

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <>
                {/* Two Column Layout: Summary + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* AI Executive Summary - Takes 2 columns */}
                  <div className="lg:col-span-2">
                    <ExecutiveSummary
                      portfolioData={{
                        totalProperties: propsData.length,
                        totalCritical: analytics.totalCritical,
                        totalImportant: analytics.totalImportant,
                        propertiesWithCritical: analytics.propertiesWithCritical
                      }}
                    />
                  </div>

                  {/* Quick Actions - Takes 1 column */}
                  <QuickActions
                    nextInspection={{
                      date: "September 14, 2024",
                      property: "Sunset Villa"
                    }}
                    criticalIssues={analytics.totalCritical}
                    pendingTasks={analytics.totalImportant}
                    recentActivity={[
                      { type: "inspection", message: "Inspection completed at Sunset Villa", time: "2 hours ago" },
                      { type: "issue", message: "New critical issue reported at Oak Manor", time: "5 hours ago" },
                      { type: "resolution", message: "HVAC maintenance completed at Pine Street", time: "1 day ago" }
                    ]}
                    onViewCritical={() => {
                      setActiveTab("properties");
                      setActive("critical");
                    }}
                    onScheduleInspection={() => {
                      setShowScheduleManager(true);
                    }}
                    onViewReports={() => {
                      setActiveTab("properties");
                      setPropertiesView("reports");
                    }}
                  />
                </div>

                {/* Metric Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <MetricCard
                    label="Next Inspection"
                    value="14 Sep"
                    subtitle="2 scheduled this week"
                    showProgress={true}
                    progressValue={75}
                  />
                  <MetricCard
                    label="Open Issues"
                    value={5}
                    subtitle="🔴 1 critical"
                    trend="↓ 20%"
                  />
                  <MetricCard
                    label="Last Report"
                    value="Aug 20"
                    subtitle="Delivered in 24h"
                    showChart={true}
                  />
                  <MetricCard
                    label="Properties"
                    value={propsData.length || 3}
                    trend="↑ 50%"
                  />
                </section>

                {/* Health Score */}
                <HealthScoreWidget
                  criticalIssues={analytics.totalCritical}
                  importantIssues={analytics.totalImportant}
                  totalProperties={propsData.length}
                />

                {/* Equipment Management */}
                <CollapsibleSection title="Equipment Management" icon={<Package className="w-5 h-5" />} defaultExpanded={false}>
                  <EquipmentInventory />
                </CollapsibleSection>

              </>
            )}

            {/* PROPERTIES TAB */}
            {activeTab === "properties" && (
              <section className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPropertiesView("grouped")}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        propertiesView === "grouped"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/10"
                          : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      <Building2 className="w-4 h-4 inline mr-2" />
                      By Property
                    </button>
                    <button
                      onClick={() => setPropertiesView("reports")}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        propertiesView === "reports"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/10"
                          : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      All Reports
                    </button>
                  </div>
                  {propertiesView === "grouped" && (
                    <div className="flex gap-2">
                      {[
                        ["all", "All"],
                        ["healthy", "Healthy"],
                        ["attention", "Needs Attention"],
                        ["critical", "Critical"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setActive(key)}
                          className={`px-4 py-1.5 rounded-full text-sm ${
                            active === key
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="glass-card rounded-2xl h-64" />
                    ))}
                  </div>
                ) : propertiesView === "grouped" ? (
                  filtered.length ? (
                <div className="space-y-4">
                  {filtered.map((property) => (
                    <PropertyAccordion
                      key={property.id}
                      property={property}
                      isExpanded={expandedProperty === property.id}
                      onToggle={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
                      onOpenReport={openReport}
                      onOpenPhotos={() => {
                        setSelectedProperty(property);
                        setShowPhotoGrid(true);
                      }}
                      onOpenHVAC={() => {
                        setHvacPropertyAddress(property.address);
                        setShowHVACModal(true);
                      }}
                      selectedYear={selectedYear}
                      selectedQuarter={selectedQuarter}
                      onYearChange={setSelectedYear}
                      onQuarterChange={setSelectedQuarter}
                      showAllReports={expandedReports[property.id] || false}
                      onToggleReports={() => {
                        setExpandedReports({
                          ...expandedReports,
                          [property.id]: !expandedReports[property.id]
                        });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-10 text-center">
                  <div className="text-white/80 font-semibold">No properties match this filter.</div>
                  <div className="text-white/50 text-sm mt-1">Try switching filters or clear search.</div>
                </div>
              )) : (
                  <div className="space-y-4">
                    {propsData.flatMap(property =>
                      property.reports.map(report => {
                        const date = new Date(report.date);
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        return (
                          <div
                            key={report.id}
                            onClick={() => openReport(report)}
                            className="glass-card rounded-xl p-6 hover:bg-white/10 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">Q{quarter} {date.getFullYear()} Maintenance Report</h3>
                                  <p className="text-sm text-white/60">{property.address} • Completed {date.toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {report.criticalIssues > 0 && (
                                  <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full">
                                    {report.criticalIssues} critical
                                  </span>
                                )}
                                {report.importantIssues > 0 && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                                    {report.importantIssues} important
                                  </span>
                                )}
                                <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors text-sm text-green-400 font-medium">
                                  ✓ View Report
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <section className="space-y-7">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-6 glass-card rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white/70">Timeframe:</span>
                    <select
                      value={analyticsTimeframe}
                      onChange={(e) => setAnalyticsTimeframe(e.target.value as any)}
                      className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 text-white transition-all cursor-pointer hover:bg-white/15"
                      style={{
                        colorScheme: 'dark'
                      }}
                    >
                      <option value="30d" className="bg-gray-900 text-white">Last 30 Days</option>
                      <option value="90d" className="bg-gray-900 text-white">Last 90 Days</option>
                      <option value="6m" className="bg-gray-900 text-white">Last 6 Months</option>
                      <option value="1y" className="bg-gray-900 text-white">Last Year</option>
                      <option value="all" className="bg-gray-900 text-white">All Time</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white/70">Property:</span>
                    <select
                      value={analyticsPropertyFilter}
                      onChange={(e) => setAnalyticsPropertyFilter(e.target.value)}
                      className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 text-white transition-all cursor-pointer hover:bg-white/15"
                      style={{
                        colorScheme: 'dark'
                      }}
                    >
                      <option value="all" className="bg-gray-900 text-white">All Properties</option>
                      {propsData.map(prop => (
                        <option key={prop.id} value={prop.address} className="bg-gray-900 text-white">{prop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300 border border-white/5">
                    <p className="text-xs text-white/50 uppercase mb-3 font-semibold tracking-wider">Total Issues Found</p>
                    <p className="text-4xl font-bold mb-2 text-white">{analytics.totalIssues}</p>
                    <p className="text-sm text-red-400 font-medium">{analytics.totalCritical} Critical</p>
                  </div>
                  <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300 border border-white/5">
                    <p className="text-xs text-white/50 uppercase mb-3 font-semibold tracking-wider">Avg Issues Per Property</p>
                    <p className="text-4xl font-bold mb-2 text-white">{analytics.avgIssuesPerProperty}</p>
                    <p className="text-sm text-white/60 font-medium">{analytics.totalImportant} Important</p>
                  </div>
                  <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300 border border-white/5">
                    <p className="text-xs text-white/50 uppercase mb-3 font-semibold tracking-wider">Properties Need Attention</p>
                    <p className="text-4xl font-bold mb-2 text-white">{analytics.propertiesWithCritical}</p>
                    <p className="text-sm text-yellow-400 font-medium">Critical Issues Found</p>
                  </div>
                  <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-all duration-300 border border-white/5">
                    <p className="text-xs text-white/50 uppercase mb-3 font-semibold tracking-wider">Total Inspections</p>
                    <p className="text-4xl font-bold mb-2 text-white">{analytics.totalInspections}</p>
                    <p className="text-sm text-white/60 font-medium">In Selected Period</p>
                  </div>
                </div>

                {/* Actionable Insights */}
                {analytics.propertiesWithCritical > 0 && (
                  <div className="glass-card rounded-xl p-6 border-red-500/30 bg-red-500/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-400 mb-2">Properties Requiring Immediate Attention</p>
                        <div className="space-y-2">
                          {analytics.reportsInTimeframe
                            .filter(r => r.criticalIssues > 0)
                            .slice(0, 3)
                            .map((report, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-white/80">{report.propertyAddress}</span>
                                <span className="text-red-400 font-medium">{report.criticalIssues} critical issue{report.criticalIssues > 1 ? 's' : ''}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issue Trends & Property Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Issue Trends Chart */}
                  <div className="glass-card rounded-xl p-6 border border-white/5 shadow-lg">
                    <h3 className="text-lg font-semibold mb-5 text-white">Issue Trends Over Time</h3>
                    <div className="space-y-3">
                      {Object.keys(analytics.issuesByMonth).length > 0 ? (
                        <>
                          {Object.entries(analytics.issuesByMonth)
                            .slice(-6)
                            .map(([month, data]) => {
                              const maxIssues = Math.max(...Object.values(analytics.issuesByMonth).map(d => d.critical + d.important));
                              const total = data.critical + data.important;
                              const percentage = maxIssues > 0 ? (total / maxIssues) * 100 : 0;

                              return (
                                <div key={month} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/70">{month}</span>
                                    <span className="text-white/90 font-medium">{total} total</span>
                                  </div>
                                  <div className="flex gap-1 h-6">
                                    <div
                                      className="bg-red-500/60 rounded-sm transition-all"
                                      style={{ width: `${(data.critical / maxIssues) * 100}%` }}
                                      title={`${data.critical} critical`}
                                    />
                                    <div
                                      className="bg-yellow-500/60 rounded-sm transition-all"
                                      style={{ width: `${(data.important / maxIssues) * 100}%` }}
                                      title={`${data.important} important`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-red-500/60"></div>
                              <span className="text-white/60">Critical</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-yellow-500/60"></div>
                              <span className="text-white/60">Important</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-white/40">No data for selected period</div>
                      )}
                    </div>
                  </div>

                  {/* Property Health Timeline */}
                  <div className="glass-card rounded-xl p-6 border border-white/5 shadow-lg">
                    <h3 className="text-lg font-semibold mb-5 text-white">Property Health Status</h3>
                    <div className="space-y-3">
                      {propsData.length > 0 ? (
                        propsData.map(property => {
                          const recentReports = property.reports.slice(0, 3);
                          const hasCritical = (property.latestReport?.criticalIssues ?? 0) > 0;
                          const hasImportant = (property.latestReport?.importantIssues ?? 0) > 0;
                          const healthColor = hasCritical ? "red" : hasImportant ? "yellow" : "green";

                          return (
                            <div key={property.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full bg-${healthColor}-400`}></div>
                                  <span className="text-sm font-medium text-white/90">{property.name}</span>
                                </div>
                                <span className="text-xs text-white/60">
                                  {property.latestReport ? new Date(property.latestReport.date).toLocaleDateString() : 'No inspections'}
                                </span>
                              </div>
                              {property.latestReport && (
                                <div className="flex gap-2 text-xs ml-4">
                                  {property.latestReport.criticalIssues > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                                      {property.latestReport.criticalIssues} critical
                                    </span>
                                  )}
                                  {property.latestReport.importantIssues > 0 && (
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                      {property.latestReport.importantIssues} important
                                    </span>
                                  )}
                                  {!property.latestReport.criticalIssues && !property.latestReport.importantIssues && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                      No issues
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-white/40">No properties available</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Report Modal - Compact */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="bg-[rgb(20,20,20)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-red-500/20">
            {/* Modal Header - Reduced padding */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold">{selectedReport.property}</h2>
                <p className="text-xs text-white/60">
                  Report from {new Date(selectedReport.date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setReportContent("");
                }}
                aria-label="Close report modal" className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Reduced padding */}
            <div className="flex-1 overflow-auto p-4">
              {loadingReport ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: reportContent }}
                  className="report-content"
                />
              )}
            </div>

            {/* Modal Footer - Reduced padding */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              <a
                href={`http://localhost:5000/api/simple/simple/${selectedReport.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
              >
                Open in New Tab
              </a>
              {selectedReport.pdfPath && (
                <a
                  href={`http://localhost:5000/api/reports/download/${selectedReport.id}`}
                  download
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Download PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid Modal - Compact */}
      {showPhotoGrid && selectedProperty && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-scale-in">
          <div className="bg-[rgb(20,20,20)] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-red-500/20">
            {/* Modal Header - Reduced padding */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold">{selectedProperty.address}</h2>
                <p className="text-xs text-white/60">
                  {selectedProperty.photos?.length || 0} inspection photos
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPhotoGrid(false);
                  setSelectedProperty(null);
                  setExpandedPhoto(null);
                }}
                aria-label="Close photo gallery modal" className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* All Photos Grid - Reduced padding */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                  selectedProperty.photos.map((photo, index) => {
                    const photoKey = `${photo.url}-${photo.reportId}`;
                    const isExpanded = expandedPhoto === photoKey;
                    const analysisData = photoAnalysis[photoKey];
                    const isLoadingThisPhoto = loadingAnalysis === photoKey;
                    
                    return (
                      <div key={photoKey} className="bg-white/5 rounded-lg overflow-hidden transition-all duration-300">
                      {/* Photo Container */}
                      <div className="relative group">
                        <div className="aspect-video w-full overflow-hidden">
                          <img
                            src={photo.url}
                            alt={`${selectedProperty.address} - Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Photo Number Badge - Top Left */}
                        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                          Photo {index + 1}
                        </div>
                        
                        {/* Zoom Button - Top Right */}
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedPhoto(photo.url);
                            }}
                            aria-label="Zoom photo" className="p-3 bg-black/70 hover:bg-black/90 rounded-full transition-colors backdrop-blur-sm border border-white/20 shadow-lg"
                            title="Zoom photo"
                          >
                            <ZoomIn className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        
                        {/* Analysis Toggle Bar - Bottom of Photo */}
                        <div className="absolute bottom-0 left-0 right-0">
                          <button
                            onClick={async () => {
                              if (isExpanded) {
                                setExpandedPhoto(null);
                              } else {
                                setExpandedPhoto(photoKey);
                                if (!analysisData && !isLoadingThisPhoto) {
                                  await fetchPhotoAnalysis(photo.url, photo.reportId);
                                }
                              }
                            }}
                            className="analysis-clip-path w-full bg-gradient-to-r from-blue-600/90 to-blue-500/90 hover:from-blue-500/90 hover:to-blue-400/90 backdrop-blur-sm transition-all duration-200 px-4 py-3 flex items-center justify-center gap-2 text-white font-medium text-sm shadow-lg border-t border-blue-400/30"
                          >
                            {isLoadingThisPhoto ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing...
                              </>
                            ) : isExpanded ? (
                              <>
                                <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                                Hide Analysis
                              </>
                            ) : (
                              <>
                                <Lightbulb className="w-4 h-4" />
                                View Analysis
                                <ChevronDown className="w-4 h-4 transition-transform" />
                              </>
                            )}
                          </button>
                        </div>
                        
                      </div>
                      
                      {/* Analysis Panel */}
                      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="p-6 border-t border-white/10">
                          {isLoadingThisPhoto ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-red-400 mr-3" />
                              <span className="text-white/60">Analyzing photo...</span>
                            </div>
                          ) : analysisData ? (
                            <div className="space-y-4">
                              {/* Severity Badge */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-white/80">Analysis Result:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  analysisData.severity === 'critical' 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : analysisData.severity === 'moderate'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                }`}>
                                  {analysisData.severity.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="grid md:grid-cols-3 gap-4">
                                {/* Observations */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Observations
                                  </h4>
                                  <ul className="space-y-1">
                                    {analysisData.observations?.map((obs: string, i: number) => (
                                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                        <span className="w-1 h-1 bg-white/40 rounded-full mt-2 flex-shrink-0"></span>
                                        {obs}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Potential Issues */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Potential Issues
                                  </h4>
                                  <ul className="space-y-1">
                                    {analysisData.potentialIssues?.map((issue: string, i: number) => (
                                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                        <span className="w-1 h-1 bg-yellow-400/60 rounded-full mt-2 flex-shrink-0"></span>
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Recommendations */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    Recommendations
                                  </h4>
                                  <ul className="space-y-1">
                                    {analysisData.recommendations?.map((rec: string, i: number) => (
                                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                        <span className="w-1 h-1 bg-green-400/60 rounded-full mt-2 flex-shrink-0"></span>
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-white/40">
                              Failed to load analysis
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })
                ) : (
                  <div className="text-center text-white/60 col-span-2">No photos available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Zoom Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setZoomedPhoto(null)}
              aria-label="Close zoomed photo" className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={zoomedPhoto}
              alt="Zoomed photo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* HVAC Maintenance Modal */}
      {showHVACModal && (
        <HVACMaintenanceModal
          propertyAddress={hvacPropertyAddress}
          onClose={() => setShowHVACModal(false)}
        />
      )}

      {/* Schedule Manager */}
      {showScheduleManager && (
        <ScheduleManager onClose={() => setShowScheduleManager(false)} />
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          properties={propsData}
          reports={propsData.flatMap(p => p.reports)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setShowCommandPalette(false);
          }}
          onOpenReport={(reportId) => {
            const report = propsData.flatMap(p => p.reports).find(r => r.id === reportId);
            if (report) openReport(report);
          }}
          onOpenProperty={(propertyId) => {
            setActiveTab("properties");
            const property = propsData.find(p => p.id === propertyId);
            if (property) {
              setExpandedProperty(propertyId);
            }
          }}
        />
      )}

      {/* AI Chat Assistant */}
      <AIChatAssistant
        portfolioData={{
          totalProperties: propsData.length,
          totalCritical: analytics.totalCritical,
          totalImportant: analytics.totalImportant,
          propertiesWithCritical: analytics.propertiesWithCritical
        }}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
          );
        }}
        onMarkAllAsRead={() => {
          setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
          );
        }}
        onDelete={(id) => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }}
      />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        notificationCount={notifications.filter(n => !n.read).length}
      />

      {/* Report Content Styles */}
      <style jsx global>{`
        /* Light mode sidebar and header overrides - Light Blue Theme */
        html.light-mode aside.sidebar-light-blue,
        html.light-mode .sidebar-light-blue {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%) !important;
          border-right-color: rgba(59, 130, 246, 0.3) !important;
          box-shadow:
            4px 0 16px rgba(59, 130, 246, 0.12),
            2px 0 8px rgba(37, 99, 235, 0.08),
            1px 0 0 rgba(147, 197, 253, 0.4) !important;
        }

        html.light-mode header.header-light-blue,
        html.light-mode .header-light-blue {
          background: linear-gradient(90deg, rgba(239, 246, 255, 0.98) 0%, rgba(224, 242, 254, 0.98) 100%) !important;
          border-bottom-color: rgba(59, 130, 246, 0.2) !important;
          box-shadow: 0 1px 0 rgba(147, 197, 253, 0.3), 0 2px 12px rgba(59, 130, 246, 0.08) !important;
        }

        /* Enhanced cards for Action Center and AI Summary in light mode */
        html.light-mode .enhanced-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.9) 100%) !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          box-shadow:
            0 8px 24px rgba(59, 130, 246, 0.15),
            0 4px 12px rgba(37, 99, 235, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        }

        html.light-mode .enhanced-card:hover {
          box-shadow:
            0 12px 32px rgba(59, 130, 246, 0.2),
            0 6px 16px rgba(37, 99, 235, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
          transform: translateY(-2px);
        }

        /* Calendar Widget Light Mode Styling */
        html.light-mode .fixed.inset-0.z-50 {
          background: rgba(0, 0, 0, 0.3) !important;
        }

        html.light-mode .fixed.inset-0.z-50 > div {
          background: linear-gradient(135deg, rgb(255, 255, 255) 0%, rgb(249, 250, 252) 100%) !important;
          border-color: rgba(59, 130, 246, 0.25) !important;
          box-shadow: 0 20px 50px rgba(59, 130, 246, 0.2), 0 10px 30px rgba(37, 99, 235, 0.15) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .text-white {
          color: rgb(30, 41, 59) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .text-white\/60,
        html.light-mode .fixed.inset-0.z-50 .text-white\/50,
        html.light-mode .fixed.inset-0.z-50 .text-white\/70,
        html.light-mode .fixed.inset-0.z-50 .text-white\/80 {
          color: rgba(30, 41, 59, 0.7) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .bg-white\/\[0\.03\] {
          background: rgba(59, 130, 246, 0.08) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .border-white\/10 {
          border-color: rgba(59, 130, 246, 0.15) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .bg-white\/\[0\.05\] {
          background: rgba(59, 130, 246, 0.05) !important;
        }

        html.light-mode .fixed.inset-0.z-50 .hover\:bg-white\/10:hover {
          background: rgba(59, 130, 246, 0.12) !important;
        }

        html.light-mode .fixed.inset-0.z-50 button.hover\:bg-white\/\[0\.15\]:hover {
          background: rgba(59, 130, 246, 0.15) !important;
        }

        .report-content {
          color: white;
        }
        .report-content h1 {
          color: #ef4444;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .report-content h3 {
          color: #fbbf24;
          margin-top: 1rem;
        }
        .report-content .item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
        }
        .report-content .critical {
          border-left: 4px solid #ef4444;
        }
        .report-content .important {
          border-left: 4px solid #f59e0b;
        }
        .analysis-clip-path {
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }
      `}</style>
    </div>
  );
}
