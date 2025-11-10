"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { MapPin, Calendar, Menu, LogOut, Building2, Images, FileText, Settings, Home, AlertTriangle, Camera, X, Wrench, Filter, ChevronDown, ZoomIn, Info, Lightbulb, Loader2, Sparkles, List, Grid, Table, SlidersHorizontal, CheckSquare } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

// Components that are always needed immediately
import MetricCard from "@/components/MetricCard";
import FloatingParticles from "@/components/FloatingParticles";
import ThemeToggle from "@/components/ThemeToggle";
import PropertyAccordion from "@/components/PropertyAccordion";
import HealthScoreWidget from "@/components/HealthScoreWidget";
import CollapsibleSection from "@/components/CollapsibleSection";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import PropertyIntelligence from "@/components/PropertyIntelligence";
import MobileNav from "@/components/MobileNav";
import DashboardGreeting from "@/components/DashboardGreeting";
import SeasonalAlertCard from "@/components/SeasonalAlertCard";
import SeasonalTasksCard from "@/components/SeasonalTasksCard";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import PropertyTableView from "@/components/PropertyTableView";
import PropertyCardGrid from "@/components/PropertyCardGrid";
import AdvancedFilters from "@/components/AdvancedFilters";
import LazyPropertyList from "@/components/LazyPropertyList";
import BulkActionsBar from "@/components/BulkActionsBar";

// Code-split heavy components that are rarely used initially
const HVACMaintenanceModal = dynamic(() => import('@/components/HVACMaintenanceModal'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading...</div>
});
const SavingsPanel = dynamic(() => import('@/components/SavingsPanel'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading savings data...</div>
});
const NextBestActions = dynamic(() => import('@/components/NextBestActions'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading recommendations...</div>
});
const TargetProgressCard = dynamic(() => import('@/components/TargetProgressCard'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading target progress...</div>
});
const RiskExposureCard = dynamic(() => import('@/components/RiskExposureCard'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading risk analysis...</div>
});
const SeasonalityCard = dynamic(() => import('@/components/SeasonalityCard'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading seasonality data...</div>
});
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading...</div>
});
// AI Chat Assistant removed for now
const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), {
  ssr: false,
  loading: () => <div className="p-4 text-white/60">Loading...</div>
});
// ScheduleManager removed - owners coordinate directly with tenants

// API configuration - Enforce HTTPS in production
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? (
  process.env.NODE_ENV === 'production'
    ? 'https://api.checkmyrental.com' // Update with actual production URL
    : 'http://127.0.0.1:8000'
);

// Validate API_BASE is using HTTPS in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const apiUrl = new URL(API_BASE);
  if (apiUrl.protocol !== 'https:') {
    console.error('Security Warning: API_BASE must use HTTPS in production');
  }
}

// Unified severity type
type Severity = 'critical' | 'important' | 'ok';
type PropertyStatus = 'ok' | 'attention' | 'critical';

interface PhotoAnalysis {
  location?: string;
  severity: Severity | 'error';
  observations: string[];
  potentialIssues: string[];
  recommendations: string[];
  note?: string;
  preloaded?: boolean;
  error?: boolean;
  message?: string;
}

interface ActivityItem {
  type: 'inspection' | 'issue' | 'resolution';
  message: string;
  time: string;
  propertyAddress?: string;
}

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
  status?: PropertyStatus;
  lastInspection?: string;
  coverUrl?: string;
  reports: Report[];
  latestReport?: Report;
  photos: Photo[];
}

// Define filter types
type PropertyFilter = 'all' | 'healthy' | 'attention' | 'critical';
type PhotoFilter = 'all' | 'critical' | 'important';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('all');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('all');
  const [propertiesView, setPropertiesView] = useState<"grouped" | "reports">("grouped");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pinnedProperties, setPinnedProperties] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"recent" | "address" | "health" | "issues">("recent");
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<"accordion" | "table" | "grid">("accordion");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    statuses: [] as string[],
    dateRange: null as { start: string; end: string } | null,
    minIssues: 0,
    maxIssues: 999
  });
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const reportModalRef = useRef<HTMLDivElement>(null);
  const photoModalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [userName, setUserName] = useState("Loading...");
  const [clientId, setClientId] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPhotoGrid, setShowPhotoGrid] = useState(false);
  const [showHVACModal, setShowHVACModal] = useState(false);
  const [hvacPropertyAddress, setHvacPropertyAddress] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<Record<string, PhotoAnalysis>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  // Schedule management removed - owners coordinate directly with tenants
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Analytics calculations - pure function
  const calculateAnalytics = (
    properties: Property[],
    timeframe: string,
    propertyFilter: string
  ) => {
    const now = new Date();
    const cutoffDate = new Date();

    // Set cutoff date based on timeframe
    switch(timeframe) {
      case "30d": cutoffDate.setDate(now.getDate() - 30); break;
      case "90d": cutoffDate.setDate(now.getDate() - 90); break;
      case "6m": cutoffDate.setMonth(now.getMonth() - 6); break;
      case "1y": cutoffDate.setFullYear(now.getFullYear() - 1); break;
      case "all": cutoffDate.setFullYear(2000); break;
    }

    // Filter reports by timeframe and property
    const filteredReports = properties.flatMap(prop =>
      prop.reports.filter(r => {
        const reportDate = new Date(r.date);
        const matchesTimeframe = reportDate >= cutoffDate;
        const matchesProperty = propertyFilter === "all" || prop.address === propertyFilter;
        return matchesTimeframe && matchesProperty;
      }).map(r => ({ ...r, propertyAddress: prop.address }))
    );

    const totalCritical = filteredReports.reduce((sum, r) => sum + (r.criticalIssues || 0), 0);
    const totalImportant = filteredReports.reduce((sum, r) => sum + (r.importantIssues || 0), 0);
    const totalIssues = totalCritical + totalImportant;

    const propertiesWithCritical = new Set(
      filteredReports.filter(r => r.criticalIssues > 0).map(r => r.propertyAddress)
    ).size;

    const avgIssuesPerProperty = properties.length > 0
      ? (totalIssues / properties.length).toFixed(1)
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

  // Memoize analytics computation
  const analytics = useMemo(
    () => calculateAnalytics(properties, "all", "all"),
    [properties]
  );

  // Compute YTD savings for target progress
  const ytdSavingsValue = useMemo(() => {
    // Simple placeholder calculation - you can enhance this
    // For now, we'll estimate based on avoided issues
    const ytdReports = properties.flatMap(p => p.reports).filter(r => {
      const reportDate = new Date(r.date);
      const startOfYear = new Date(reportDate.getFullYear(), 0, 1);
      const now = new Date();
      return reportDate >= startOfYear && reportDate <= now;
    });

    // Estimate $500 per critical issue avoided, $200 per important issue
    const estimatedSavings = ytdReports.reduce((sum, r) => {
      return sum + (r.criticalIssues * 500) + (r.importantIssues * 200);
    }, 0);

    return estimatedSavings;
  }, [properties]);

  // Generate real activity feed from actual properties/reports
  const generateRecentActivity = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Get all reports sorted by date
    const allReports = properties.flatMap(prop =>
      prop.reports.map(r => ({ ...r, propertyAddress: prop.address }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate activities from most recent reports
    allReports.slice(0, 10).forEach(report => {
      const reportDate = new Date(report.date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));

      let timeAgo;
      if (diffDays === 0) {
        timeAgo = "Today";
      } else if (diffDays === 1) {
        timeAgo = "Yesterday";
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        const months = Math.floor(diffDays / 30);
        timeAgo = `${months} month${months > 1 ? 's' : ''} ago`;
      }

      // Add inspection completion activity
      activities.push({
        type: "inspection",
        message: `Inspection completed at ${report.propertyAddress}`,
        time: timeAgo,
        propertyAddress: report.propertyAddress
      });

      // Add critical issue activity if applicable
      if (report.criticalIssues > 0) {
        activities.push({
          type: "issue",
          message: `${report.criticalIssues} critical ${report.criticalIssues === 1 ? 'issue' : 'issues'} found at ${report.propertyAddress}`,
          time: timeAgo,
          propertyAddress: report.propertyAddress
        });
      }

      // Add resolution/maintenance activity for important issues
      if (report.importantIssues > 0 && !report.criticalIssues) {
        activities.push({
          type: "resolution",
          message: `${report.importantIssues} maintenance ${report.importantIssues === 1 ? 'item' : 'items'} identified at ${report.propertyAddress}`,
          time: timeAgo,
          propertyAddress: report.propertyAddress
        });
      }
    });

    return activities.slice(0, 5); // Return top 5 most recent
  };

  // Function to fetch photo analysis with stable reference
  const fetchPhotoAnalysis = useCallback(async (photoUrl: string, reportId?: string) => {
    const photoKey = `${photoUrl}-${reportId}`;

    // Return cached analysis if FULL analysis is available (not just preloaded severity)
    if (photoAnalysis[photoKey] && !photoAnalysis[photoKey].preloaded) {
      return photoAnalysis[photoKey];
    }
    
    setLoadingAnalysis(photoKey);
    
    try {
      if (!reportId) {
        throw new Error("No report ID available for this photo");
      }
      
      // Extract filename from URL
      const rawName = new URL(photoUrl, window.location.origin).pathname.split('/').pop()!;
      const encodedName = encodeURIComponent(rawName);

      // Call the actual backend API
      const response = await fetch(`${API_BASE}/api/photo-report/${encodeURIComponent(reportId!)}/${encodedName}/json`);
      
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
        note: analysisData.note,
        preloaded: false // Mark as fully loaded
      };

      setPhotoAnalysis(prev => ({
        ...prev,
        [photoKey]: actualAnalysis
      }));
      
      return actualAnalysis;
    } catch (error) {
      console.error('Failed to fetch photo analysis:', error);
      // Store error state for this photo
      const errorAnalysis: PhotoAnalysis = {
        error: true,
        message: error instanceof Error ? error.message : 'Failed to load analysis',
        severity: 'error' as const,
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
  }, [photoAnalysis]);

  // Batch-load all photo severities when photo modal opens
  useEffect(() => {
    if (showPhotoGrid && selectedProperty) {
      // Fetch all photo severities at once
      fetch(`${API_BASE}/api/batch/property/${encodeURIComponent(selectedProperty.address)}/severities`)
        .then(res => res.json())
        .then(data => {
          if (data.severities) {
            // Pre-populate photoAnalysis with severity data
            const newAnalysis: Record<string, any> = {};

            selectedProperty.photos.forEach(photo => {
              const filename = photo.url.split('/').pop();
              if (filename && data.severities[filename]) {
                const photoKey = `${photo.url}-${photo.reportId}`;
                const sevData = data.severities[filename];

                newAnalysis[photoKey] = {
                  severity: sevData.severity,
                  location: sevData.location,
                  // Mark as pre-loaded but not fully loaded yet
                  preloaded: true
                };
              }
            });

            setPhotoAnalysis(prev => ({ ...prev, ...newAnalysis }));
          }
        })
        .catch(err => console.error('Failed to batch load severities:', err));
    }
  }, [showPhotoGrid, selectedProperty]);

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
    let isMounted = true;
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Get code from URL params (one-time exchange code, not a persistent token)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("token") || "";
    const isDemo = urlParams.get("demo") === "true";
    const useMock = urlParams.get("mock") === "true" || isDemo || !code;

    // If mock=true or no code, load mock data directly
    if (useMock) {
      console.log("🔄 Loading mock data...");
      // Loading mock data
      fetch('/mock-data.json', { signal })
        .then(res => {
          console.log("✅ Mock data fetch response:", res.status);
          return res.json();
        })
        .then(mockData => {
          if (signal.aborted) return;
          console.log("✅ Mock data loaded:", mockData);
          console.log(`📊 Found ${mockData.reports?.length || 0} reports`);
          setUserName(mockData.owner);
          handleReportsData({ reports: mockData.reports });
        })
        .catch(err => {
          if (!signal.aborted) {
            console.error("❌ Failed to load mock data:", err);
          }
        });
      return () => abortController.abort();
    }

    // Fetch dashboard data using JWT token
    // Check if token is in "portal_X" format (from operator app) or JWT format
    const isPortalToken = code.startsWith('portal_');

    console.log(isPortalToken ? '🔑 Fetching dashboard with portal token' : '🔑 Fetching dashboard with JWT token');
    console.log('📍 API_BASE:', API_BASE);
    console.log('🎫 Token:', code.substring(0, 50) + '...');

    const dashboardUrl = isPortalToken
      ? `${API_BASE}/api/owners/dashboard?portal_token=${code}`
      : `${API_BASE}/api/owners/dashboard?portal_token=${code}`;

    // Both JWT and portal tokens now use the same approach (portal_token parameter)
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    fetch(dashboardUrl, fetchOptions)
      .then(res => {
        console.log('📥 Dashboard API response status:', res.status);
        if (!res.ok) {
          throw new Error(`Dashboard fetch failed: ${res.status}`);
        }
        return res.json();
      })
      .then(dashboardData => {
        // Dashboard data received
        console.log('✅ Dashboard data received:', dashboardData);

        if (!isMounted) return; // Don't update state if unmounted

        // Remove the token from URL to prevent exposure in history/referer
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());

        if (dashboardData.owner) {
          setUserName(dashboardData.owner);
        } else if (dashboardData.full_name) {
          setUserName(dashboardData.full_name);
        } else if (dashboardData.email) {
          // Use email as fallback
          setUserName(dashboardData.email.split('@')[0]);
        }

        // Store client ID for seasonal tasks
        if (dashboardData.client_id) {
          setClientId(dashboardData.client_id);
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
        return code;
      })
      .then(effectiveToken => {
        // Only fetch reports if we didn't get properties from dashboard
        if (!effectiveToken) return { reports: [] };
        return fetch(`${API_BASE}/api/reports/list?owner_id=${effectiveToken}`, {
          credentials: 'include'
        }).then(res => res.json());
      })
      .then(async data => {
        if (data && data.reports && data.reports.length > 0) {
          handleReportsData(data);
        }
      })
      .catch(err => {
        // Could not fetch from backend, loading mock data
        console.error('❌ Dashboard fetch error:', err);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);

        // Clean up URL even on error
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());

        // Load mock data as fallback
        console.log('🔄 Loading mock data as fallback...');
        fetch('/mock-data.json')
          .then(res => res.json())
          .then(mockData => {
            setUserName(mockData.owner);
            handleReportsData({ reports: mockData.reports });
          })
          .catch(err => console.error("Failed to load mock data:", err));
      });

    // Cleanup function to abort fetch on unmount
    return () => {
      isMounted = false;
      // Only abort if component unmounts, not on re-renders
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Focus management for report modal
  useEffect(() => {
    if (selectedReport && reportModalRef.current) {
      reportModalRef.current.focus();
    }
  }, [selectedReport]);

  // Focus management for photo modal
  useEffect(() => {
    if (showPhotoGrid && photoModalRef.current) {
      photoModalRef.current.focus();
    }
  }, [showPhotoGrid]);

  const handleDashboardData = async (dashboardData: {
    properties?: Array<{
      id?: string;
      address: string;
      lastInspection?: string;
      reports?: Array<{
        id: string;
        date: string;
        inspector?: string;
        status?: string;
        criticalIssues?: number;
        importantIssues?: number;
      }>;
    }>;
    owner?: string;
    full_name?: string;
    email?: string;
  }) => {
    // Convert dashboard API format to properties format
    if (!dashboardData.properties || dashboardData.properties.length === 0) {
      setProperties([]);
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
        property.reports = prop.reports.map((r) => ({
          id: r.id,
          date: r.date,
          property: prop.address,
          inspector: r.inspector || "Inspection Agent",
          status: r.status || "completed",
          criticalIssues: r.criticalIssues || 0,
          importantIssues: r.importantIssues || 0,
          totalPhotos: 0
        }));

        // Sort reports by date (newest first) before setting latest report
        property.reports.sort((a, b) => +new Date(b.date) - +new Date(a.date));

        // Set latest report
        property.latestReport = property.reports[0];

        // Set status based on latest report
        const latest = property.latestReport;
        property.status =
          (latest?.criticalIssues ?? 0) > 0 ? 'critical' :
          (latest?.importantIssues ?? 0) > 0 ? 'attention' : 'ok' as PropertyStatus;
        property.lastInspection = latest?.date;
      }

      // Fetch photos for this property
      try {
        const photosRes = await fetch(`${API_BASE}/api/photos/property/${encodeURIComponent(prop.address)}`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          const photoItems = photosData.items || photosData.photos || [];

          if (photoItems.length > 0) {
            property.photos = photoItems.map((p: { url: string; report_id?: string; reportId?: string }) => {
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

    setProperties(properties);
    setLoading(false);
  };

  const handleReportsData = async (data: { reports?: Report[] }) => {
    console.log("📥 handleReportsData called with:", data);
    if (data.reports) {
          console.log(`🏠 Processing ${data.reports.length} reports...`);
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
          });

          // After grouping, sort by date and compute status from the true latest report
          for (const property of propertyMap.values()) {
            property.reports.sort((a, b) => +new Date(b.date) - +new Date(a.date));
            property.latestReport = property.reports[0];
            const latest = property.latestReport;
            property.status =
              (latest?.criticalIssues ?? 0) > 0 ? 'critical' :
              (latest?.importantIssues ?? 0) > 0 ? 'attention' : 'ok' as PropertyStatus;
            property.lastInspection = latest?.date;
          }
          
          // Skip photo fetching for mock data (backend may not be running)
          const isMockData = !window.location.search.includes('token=');

          if (!isMockData) {
            // Fetch photos for each property in parallel (only when using real backend)
            await Promise.all(
              Array.from(propertyMap).map(async ([address, property]) => {
                try {
                  const photosRes = await fetch(`${API_BASE}/api/photos/property/${encodeURIComponent(address)}`);
                  if (photosRes.ok) {
                    const photosData = await photosRes.json();

                    // Handle both 'photos' and 'items' response formats
                    const photoItems = photosData.items || photosData.photos || [];

                    if (photoItems.length > 0) {
                      property.photos = photoItems.map((p: { url: string; reportId?: string; report_id?: string }) => {
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
              })
            );
          } else {
            console.log("⏭️  Skipping photo fetch for mock data");
          }

      const propertiesArray = Array.from(propertyMap.values());
      console.log(`✅ Setting ${propertiesArray.length} properties:`, propertiesArray);
      setProperties(propertiesArray);
    }
    setLoading(false);
    console.log("✅ handleReportsData complete, loading set to false");
  };

  // Proper logout function with stable reference
  const handleLogout = useCallback(async () => {
    try {
      // Call logout endpoint to clear session server-side
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // Even if logout fails, redirect to landing page
    } finally {
      // Clear any local storage tokens
      localStorage.removeItem('portal_jwt');

      // Redirect to Astro landing page
      window.location.href = 'http://localhost:4321';
    }
  }, []);

  const openReport = useCallback(async (report: Report) => {
    setSelectedReport(report);
    setLoadingReport(true);

    // Find the property for this report
    const property = properties.find(p => p.address === report.property ||
                                    p.reports?.some(r => r.id === report.id));
    if (property) {
      setSelectedProperty(property);
    }

    // No need to fetch content anymore - PDF will be loaded directly in iframe
    setLoadingReport(false);
  }, [properties]);

  // Filter properties based on current filters
  const filtered = properties.filter((p) => {
    // Basic status filter
    const matchesStatus =
      propertyFilter === "all" ||
      (propertyFilter === "healthy" && p.status === "ok") ||
      (propertyFilter === "attention" && p.status === "attention") ||
      (propertyFilter === "critical" && p.status === "critical");

    // Advanced status filter (multi-select)
    const matchesAdvancedStatus =
      advancedFilters.statuses.length === 0 ||
      (p.status && advancedFilters.statuses.includes(p.status));

    // Search filter - search across property name and address
    const matchesSearch = searchQuery.trim() === "" ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());

    // Date range filter
    const matchesDateRange =
      !advancedFilters.dateRange ||
      (!advancedFilters.dateRange.start && !advancedFilters.dateRange.end) ||
      p.reports.some(r => {
        const reportDate = new Date(r.date);
        const start = advancedFilters.dateRange?.start
          ? new Date(advancedFilters.dateRange.start)
          : null;
        const end = advancedFilters.dateRange?.end
          ? new Date(advancedFilters.dateRange.end)
          : null;
        if (start && reportDate < start) return false;
        if (end && reportDate > end) return false;
        return true;
      });

    // Issue count filter
    const totalIssues = (p.latestReport?.criticalIssues || 0) + (p.latestReport?.importantIssues || 0);
    const matchesIssueCount =
      totalIssues >= advancedFilters.minIssues &&
      totalIssues <= advancedFilters.maxIssues;

    return matchesStatus && matchesAdvancedStatus && matchesSearch && matchesDateRange && matchesIssueCount;
  });

  // Sort filtered properties
  const sortedAndFiltered = useMemo(() => {
    const sorted = [...filtered];

    // Sort based on selected option
    sorted.sort((a, b) => {
      // Pinned properties always come first
      const aIsPinned = pinnedProperties.has(a.id);
      const bIsPinned = pinnedProperties.has(b.id);
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      // Then sort by selected criteria
      switch (sortBy) {
        case "recent":
          // Sort by latest report date
          const aDate = a.latestReport?.date || a.lastInspection || "1900-01-01";
          const bDate = b.latestReport?.date || b.lastInspection || "1900-01-01";
          return new Date(bDate).getTime() - new Date(aDate).getTime();

        case "address":
          return a.address.localeCompare(b.address);

        case "health":
          // Sort by health score (critical < attention < ok)
          const healthOrder = { critical: 0, attention: 1, ok: 2 };
          const aHealth = healthOrder[a.status || "ok"];
          const bHealth = healthOrder[b.status || "ok"];
          return aHealth - bHealth;

        case "issues":
          // Sort by total issues (descending)
          const aIssues = (a.latestReport?.criticalIssues || 0) + (a.latestReport?.importantIssues || 0);
          const bIssues = (b.latestReport?.criticalIssues || 0) + (b.latestReport?.importantIssues || 0);
          return bIssues - aIssues;

        default:
          return 0;
      }
    });

    return sorted;
  }, [filtered, sortBy, pinnedProperties, advancedFilters]);

  // Toggle pin for a property
  const togglePin = useCallback((propertyId: string) => {
    setPinnedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  }, []);

  // Track recently viewed properties
  const markAsViewed = useCallback((propertyId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== propertyId);
      return [propertyId, ...filtered].slice(0, 5); // Keep last 5
    });
  }, []);

  // Bulk action handlers
  const handleSelectProperty = useCallback((id: string, checked: boolean) => {
    setSelectedProperties(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedProperties(new Set(sortedAndFiltered.map(p => p.id)));
  }, [sortedAndFiltered]);

  const handleDeselectAll = useCallback(() => {
    setSelectedProperties(new Set());
  }, []);

  const handleBulkDownloadReports = useCallback(() => {
    selectedProperties.forEach(id => {
      const property = properties.find(p => p.id === id);
      property?.reports.forEach(report => {
        if (report.pdfPath) {
          window.open(report.pdfPath, '_blank');
        }
      });
    });
  }, [selectedProperties, properties]);

  const handleBulkDownloadPhotos = useCallback(() => {
    // TODO: Implement ZIP download for all selected properties' photos
    console.log('Bulk download photos for:', Array.from(selectedProperties));
    alert(`Downloading photos for ${selectedProperties.size} properties. Feature in development.`);
  }, [selectedProperties]);

  const handleExportCSV = useCallback(() => {
    const csvRows = ['Property Name,Address,Status,Last Inspection,Critical Issues,Important Issues,Reports Count,Photos Count'];

    selectedProperties.forEach(id => {
      const property = properties.find(p => p.id === id);
      if (property) {
        const lastInspection = property.latestReport?.date || property.lastInspection || 'N/A';
        const criticalIssues = property.latestReport?.criticalIssues || 0;
        const importantIssues = property.latestReport?.importantIssues || 0;
        csvRows.push(
          `"${property.name}","${property.address}","${property.status || 'unknown'}","${lastInspection}",${criticalIssues},${importantIssues},${property.reports.length},${property.photos.length}`
        );
      }
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `properties-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [selectedProperties, properties]);

  const handleEmailSummary = useCallback(() => {
    // TODO: Implement email summary functionality
    console.log('Email summary for:', Array.from(selectedProperties));
    alert(`Preparing email summary for ${selectedProperties.size} properties. Feature in development.`);
  }, [selectedProperties]);

  // Keyboard navigation
  useKeyboardNavigation({
    onReportsView: () => {
      setActiveTab("properties");
      setPropertiesView("reports");
    },
    onPhotosView: (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property as any);
        setShowPhotoGrid(true);
      }
    },
    onHVACView: (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setHvacPropertyAddress(property.address);
        setShowHVACModal(true);
      }
    },
    onNumberKeyPress: (index) => {
      if (activeTab === "properties" && sortedAndFiltered[index]) {
        setExpandedProperty(
          expandedProperty === sortedAndFiltered[index].id ? null : sortedAndFiltered[index].id
        );
        markAsViewed(sortedAndFiltered[index].id);
      }
    },
    onEscape: () => {
      // Close any open modals/overlays
      if (selectedReport) setSelectedReport(null);
      if (showPhotoGrid) setShowPhotoGrid(false);
      if (showHVACModal) setShowHVACModal(false);
      if (expandedPhoto) setExpandedPhoto(null);
      if (zoomedPhoto) setZoomedPhoto(null);
    },
    enabled: true,
    properties: sortedAndFiltered
  });

  return (
    <div className="min-h-screen p-4 md:p-6 light-mode:bg-gradient-to-br light-mode:from-slate-100 light-mode:via-blue-50 light-mode:to-slate-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-black dark:to-gray-950 relative">
      {/* Floating Particles Background - respect user's motion preference */}
      {!prefersReducedMotion && <FloatingParticles />}

      {/* Main Dashboard Window Frame */}
      <div className="grid md:grid-cols-[250px_1fr] min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden relative shadow-2xl border-2 light-mode:border-blue-200/60 dark:border-blue-500/20 light-mode:bg-white dark:bg-[rgb(10,10,10)]"
        style={{
          boxShadow: 'var(--dashboard-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.05))'
        }}>

        {/* Corner Decorative Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 light-mode:border-blue-300/40 dark:border-blue-400/30 rounded-tl-3xl pointer-events-none z-50 opacity-60"></div>
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 light-mode:border-blue-300/40 dark:border-blue-400/30 rounded-tr-3xl pointer-events-none z-50 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 light-mode:border-blue-300/40 dark:border-blue-400/30 rounded-bl-3xl pointer-events-none z-50 opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 light-mode:border-blue-300/40 dark:border-blue-400/30 rounded-br-3xl pointer-events-none z-50 opacity-60"></div>

        {/* Top Edge Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent pointer-events-none z-50"></div>

        {/* Ambient Corner Glows */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>

      {/* Sidebar - Executive Premium Design */}
      <aside className="hidden md:flex flex-col border-r border-white/10 bg-black/80 light-mode:bg-blue-50 z-10 sidebar-light-blue relative overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(100,120,150,0.03)] via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(59,130,246,0.05)] rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo Section - Icon Only */}
        <div className="px-6 py-7 border-b border-white/10 light-mode:border-blue-200/30 relative flex flex-col items-center gap-2">
          {/* Custom Logo Icon - House with Checkmark */}
          <div className="relative w-20 h-20 group hover:scale-105 transition-transform">
            {/* House (rotated square) - Dark in both modes for contrast */}
            <div className="absolute top-2 left-2 w-16 h-16 bg-[#2c3e50] light-mode:bg-[#1e293b] transform rotate-45 shadow-lg">
              {/* Window grid - White in dark mode, light blue in light mode */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 grid grid-cols-2 grid-rows-2 gap-1">
                <span className="bg-white light-mode:bg-blue-100"></span>
                <span className="bg-white light-mode:bg-blue-100"></span>
                <span className="bg-white light-mode:bg-blue-100"></span>
                <span className="bg-white light-mode:bg-blue-100"></span>
              </div>
            </div>

            {/* Checkmark circle - Red in both modes */}
            <div className="absolute bottom-0 right-0 w-9 h-9 bg-[rgb(231,76,60)] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(231,76,60,0.5)] light-mode:shadow-[0_4px_20px_rgba(231,76,60,0.6)]">
              {/* Checkmark - White in both modes */}
              <div className="w-[14px] h-[7px] border-white border-b-[3px] border-l-[3px] transform rotate-[-45deg] translate-y-[-1.5px]"></div>
            </div>
          </div>

          {/* Beta Badge */}
          <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-lg">
            Beta
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 text-sm relative">
          {/* Quick Stats Card */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="text-xs text-white/70 uppercase tracking-wider mb-3 font-semibold">Quick Stats</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs">Properties</span>
                <span className="text-white font-bold text-sm">{properties.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs">Critical Issues</span>
                <span className="text-red-400 font-bold text-sm">{analytics.totalCritical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs">Reports</span>
                <span className="text-blue-400 font-bold text-sm">{analytics.totalInspections}</span>
              </div>
            </div>
          </div>

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
            <Home className={`w-5 h-5 transition-transform ${activeTab === "overview" ? "" : "group-hover:scale-110"}`} aria-hidden="true" />
            <span className="flex-1 text-left">Dashboard</span>
            {activeTab === "overview" && analytics.totalCritical > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-lg">
                {analytics.totalCritical}
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
            <Building2 aria-hidden="true" className={`w-5 h-5 transition-transform ${activeTab === "properties" ? "" : "group-hover:scale-110"}`} />
            <span className="flex-1 text-left">Properties</span>
            {properties.length > 0 && (
              <span className="text-white/60 text-[10px] font-medium">{properties.length}</span>
            )}
          </button>

          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-[rgba(100,120,150,0.15)] transition-all duration-200 group hover:scale-[1.01]">
            <Settings className="w-5 h-5 group-hover:scale-110 group-hover:rotate-45 transition-all" aria-hidden="true" />
            <span className="flex-1 text-left">Settings</span>
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-red-500/30 transition-all duration-200 group hover:scale-[1.01] mt-2"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </nav>
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
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 pb-16 pt-10 relative z-10">
          <div className="max-w-screen-2xl mx-auto px-6 md:px-10 space-y-6">
            {/* Greeting Header - Only show on Dashboard Overview */}
            {activeTab === "overview" && (
              <DashboardGreeting ownerName={userName || "Owner"} />
            )}

            {/* Page Title with Icon */}
            <div className="flex items-center gap-3 mb-4">
              {activeTab === "overview" && (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border light-mode:border-blue-300/30 dark:border-blue-400/30">
                    <Home className="w-5 h-5 light-mode:text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-semibold light-mode:text-gray-900 dark:text-white">
                    Dashboard Overview
                  </h2>
                </>
              )}
              {activeTab === "properties" && (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border light-mode:border-blue-300/30 dark:border-blue-400/30">
                    <Building2 className="w-5 h-5 light-mode:text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-semibold light-mode:text-gray-900 dark:text-white">
                    Properties & Reports
                  </h2>
                </>
              )}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <>
                {/* AI Property Intelligence Dashboard */}
                <PropertyIntelligence
                  portfolioData={{
                    totalProperties: properties.length,
                    totalCritical: analytics.totalCritical,
                    totalImportant: analytics.totalImportant,
                    propertiesWithCritical: analytics.propertiesWithCritical
                  }}
                  properties={properties}
                />

                {/* Metric Cards */}
                <section className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                  {/* Florida Seasonal Alert Card */}
                  <SeasonalAlertCard />

                  {/* Portfolio Health - spans 3 columns */}
                  <div className="lg:col-span-3">
                    <HealthScoreWidget
                      criticalIssues={analytics.totalCritical}
                      importantIssues={analytics.totalImportant}
                      totalProperties={properties.length}
                      properties={properties}
                    />
                  </div>
                </section>


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

                    {/* Display Mode Selector - Only show in grouped view */}
                    {propertiesView === "grouped" && (
                      <>
                        <div className="flex gap-1 ml-4 border border-white/20 rounded-lg p-1">
                          <button
                            onClick={() => setDisplayMode("accordion")}
                            className={`p-2 rounded transition-all ${
                              displayMode === "accordion"
                                ? "bg-red-500/20 text-red-400"
                                : "text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                            title="Accordion view"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDisplayMode("grid")}
                            className={`p-2 rounded transition-all ${
                              displayMode === "grid"
                                ? "bg-red-500/20 text-red-400"
                                : "text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                            title="Grid view"
                          >
                            <Grid className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDisplayMode("table")}
                            className={`p-2 rounded transition-all ${
                              displayMode === "table"
                                ? "bg-red-500/20 text-red-400"
                                : "text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                            title="Table view"
                          >
                            <Table className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bulk Actions Toggle */}
                        <button
                          onClick={() => {
                            setShowBulkActions(!showBulkActions);
                            if (showBulkActions) {
                              setSelectedProperties(new Set());
                            }
                          }}
                          className={`ml-2 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                            showBulkActions
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/10 border border-white/20"
                          }`}
                          title="Toggle bulk actions"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span className="hidden sm:inline">Bulk Select</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  {propertiesView === "grouped" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white hover:bg-white/15 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="recent" className="bg-gray-900">Latest Report</option>
                        <option value="address" className="bg-gray-900">Address</option>
                        <option value="health" className="bg-gray-900">Health Score</option>
                        <option value="issues" className="bg-gray-900">Issue Count</option>
                      </select>
                      <button
                        onClick={() => setShowAdvancedFilters(true)}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all flex items-center gap-2 text-sm font-medium border border-purple-500/30"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        Advanced
                        {(advancedFilters.statuses.length > 0 || advancedFilters.dateRange || advancedFilters.minIssues > 0 || advancedFilters.maxIssues < 999) && (
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        )}
                      </button>
                    </div>
                  )}

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
                          onClick={() => setPropertyFilter(key as PropertyFilter)}
                          className={`px-4 py-1.5 rounded-full text-sm ${
                            propertyFilter === key
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
                  sortedAndFiltered.length ? (
                    displayMode === "table" ? (
                      <PropertyTableView
                        properties={sortedAndFiltered}
                        pinnedProperties={pinnedProperties}
                        onTogglePin={togglePin}
                        onSelectProperty={(property) => {
                          setExpandedProperty(property.id);
                          markAsViewed(property.id);
                        }}
                        onOpenPhotos={(property) => {
                          setSelectedProperty(property as any);
                          setShowPhotoGrid(true);
                        }}
                        onOpenReports={(property) => {
                          if (property.latestReport) {
                            openReport(property.latestReport as any);
                          }
                        }}
                        selectedProperties={selectedProperties}
                        onSelect={handleSelectProperty}
                        showCheckboxes={showBulkActions}
                      />
                    ) : displayMode === "grid" ? (
                      <PropertyCardGrid
                        properties={sortedAndFiltered}
                        pinnedProperties={pinnedProperties}
                        onTogglePin={togglePin}
                        onSelectProperty={(property) => {
                          setExpandedProperty(property.id);
                          markAsViewed(property.id);
                        }}
                        selectedProperties={selectedProperties}
                        onSelect={handleSelectProperty}
                        showCheckboxes={showBulkActions}
                      />
                    ) : (
                      <LazyPropertyList
                        properties={sortedAndFiltered}
                        onOpenReport={openReport}
                        onOpenPhotos={(property) => {
                          setSelectedProperty(property as any);
                          setShowPhotoGrid(true);
                        }}
                        onOpenHVAC={(address) => {
                          setHvacPropertyAddress(address);
                          setShowHVACModal(true);
                        }}
                        expandedProperty={expandedProperty}
                        onToggleProperty={(id) => {
                          setExpandedProperty(expandedProperty === id ? null : id);
                          markAsViewed(id);
                        }}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        onYearChange={setSelectedYear}
                        onQuarterChange={setSelectedQuarter}
                        expandedReports={expandedReports}
                        onToggleReports={(id) => {
                          setExpandedReports({
                            ...expandedReports,
                            [id]: !expandedReports[id]
                          });
                        }}
                        pinnedProperties={pinnedProperties}
                        onPin={togglePin}
                        selectedProperties={selectedProperties}
                        onSelectProperty={handleSelectProperty}
                        showCheckboxes={showBulkActions}
                      />
                    )
              ) : (
                <div className="glass-card rounded-2xl p-10 text-center">
                  <div className="text-white/80 font-semibold">No properties match this filter.</div>
                  <div className="text-white/70 text-sm mt-1">Try switching filters or clear search.</div>
                </div>
              )) : (
                  <div className="space-y-4">
                    {properties.flatMap(property =>
                      property.reports.map(report => {
                        const date = new Date(report.date);
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        return (
                          <button
                            key={report.id}
                            type="button"
                            onClick={() => openReport(report)}
                            className="glass-card rounded-xl p-6 hover:bg-white/10 cursor-pointer transition-all group w-full text-left"
                            aria-label={`Open report Q${quarter} ${date.getFullYear()} for ${property.address}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">Q{quarter} {date.getFullYear()} Maintenance Report</h3>
                                  <p className="text-sm text-white/60">{property.address} • Completed {date.toLocaleDateString('en-US')}</p>
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
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            )}

          </div>
        </main>
      </div>

      {/* Report Modal - Compact */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedReport(null);
              setReportContent("");
            }
          }}
        >
          <div className="bg-[rgb(20,20,20)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-red-500/20" tabIndex={-1} ref={reportModalRef}>
            <h2 id="report-modal-title" className="sr-only">Report details for {selectedReport.property}</h2>
            {/* Modal Header - Reduced padding */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold" aria-hidden="true">{selectedReport.property}</h2>
                <p className="text-xs text-white/60">
                  Report from {new Date(selectedReport.date).toLocaleDateString('en-US')}
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

            {/* Modal Content - PDF Info */}
            <div className="flex-1 overflow-hidden p-8">
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-red-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-white">PDF Report Available</h3>
                  <p className="text-white/60 max-w-md">
                    Click the button below to open the full inspection report in a new tab
                  </p>
                </div>
                {selectedProperty && (
                  <div className="flex flex-col items-center gap-4 mt-4">
                    <div className="text-sm text-white/70">
                      Report for: <span className="text-white/70 font-medium">{selectedProperty.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - Reduced padding */}
            <div className="p-4 border-t border-white/10 flex justify-center gap-3">
              {selectedProperty && (
                <>
                  <a
                    href={`${API_BASE}/api/pdf/property/${encodeURIComponent(selectedProperty.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-red-500/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                  <a
                    href={`${API_BASE}/api/pdf/property/${encodeURIComponent(selectedProperty.address)}/download`}
                    download
                    className="px-5 py-2.5 rounded-lg border border-white/20 hover:bg-white/10 transition-all duration-200 font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid Modal - Compact */}
      {showPhotoGrid && selectedProperty && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowPhotoGrid(false);
              setSelectedProperty(null);
              setExpandedPhoto(null);
            }
          }}
        >
          <div className="bg-[rgb(20,20,20)] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-red-500/20" tabIndex={-1} ref={photoModalRef}>
            <h2 id="photo-modal-title" className="sr-only">Photo gallery for {selectedProperty.address}</h2>
            {/* Modal Header - Reduced padding */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold" aria-hidden="true">{selectedProperty.address}</h2>
                <p className="text-xs text-white/60">
                  {photoFilter === "critical"
                    ? `${selectedProperty.photos.filter(p => {
                        const pk = `${p.url}-${p.reportId}`;
                        const a = photoAnalysis[pk];
                        return a && a.severity === "critical";
                      }).length} critical ${selectedProperty.photos.filter(p => {
                        const pk = `${p.url}-${p.reportId}`;
                        const a = photoAnalysis[pk];
                        return a && a.severity === "critical";
                      }).length === 1 ? 'issue' : 'issues'} found`
                    : photoFilter === "important"
                    ? `${selectedProperty.photos.filter(p => {
                        const pk = `${p.url}-${p.reportId}`;
                        const a = photoAnalysis[pk];
                        return a && a.severity === "important";
                      }).length} important ${selectedProperty.photos.filter(p => {
                        const pk = `${p.url}-${p.reportId}`;
                        const a = photoAnalysis[pk];
                        return a && a.severity === "important";
                      }).length === 1 ? 'issue' : 'issues'} found`
                    : `${selectedProperty.photos?.length || 0} inspection photos`}
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
                  selectedProperty.photos
                    .filter((photo) => {
                      const photoKey = `${photo.url}-${photo.reportId}`;
                      const analysis = photoAnalysis[photoKey];

                      // If critical filter is active, only show critical photos
                      if (photoFilter === "critical") {
                        return analysis && analysis.severity === "critical";
                      }

                      // If important filter is active, only show important photos
                      if (photoFilter === "important") {
                        return analysis && analysis.severity === "important";
                      }

                      // Otherwise show all photos
                      return true;
                    })
                    .map((photo, index) => {
                    const photoKey = `${photo.url}-${photo.reportId}`;
                    const isExpanded = expandedPhoto === photoKey;
                    const analysisData = photoAnalysis[photoKey];
                    const isLoadingThisPhoto = loadingAnalysis === photoKey;
                    
                    return (
                      <div
                        key={photoKey}
                        className="bg-white/5 rounded-lg overflow-hidden transition-all duration-300"
                        data-severity={analysisData?.severity || "unknown"}
                      >
                      {/* Photo Container */}
                      <div className="relative group">
                        <div className="aspect-video w-full overflow-hidden">
                          <img
                            src={photo.url}
                            alt={`${selectedProperty.address} - Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
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
                                  analysisData.severity === 'critical' || analysisData.severity === 'error'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : analysisData.severity === 'important'
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
                            <div className="text-center py-4 text-white/60">
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
              loading="lazy"
              decoding="async"
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

      {/* Schedule Manager removed - owners coordinate directly with tenants */}

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          properties={properties}
          reports={properties.flatMap(p => p.reports)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setShowCommandPalette(false);
          }}
          onOpenReport={(reportId) => {
            const report = properties.flatMap(p => p.reports).find(r => r.id === reportId);
            if (report) openReport(report);
          }}
          onOpenProperty={(propertyId) => {
            setActiveTab("properties");
            const property = properties.find(p => p.id === propertyId);
            if (property) {
              setExpandedProperty(propertyId);
            }
          }}
        />
      )}

      {/* AI Chat Assistant removed for now */}
      {/* Notification Center removed */}

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp />

      {/* Bulk Actions Bar */}
      {selectedProperties.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedProperties.size}
          totalCount={sortedAndFiltered.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDownloadReports={handleBulkDownloadReports}
          onDownloadPhotos={handleBulkDownloadPhotos}
          onExportCSV={handleExportCSV}
          onEmailSummary={handleEmailSummary}
        />
      )}

      {/* Advanced Filters Modal */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => setAdvancedFilters(filters)}
        currentFilters={advancedFilters}
      />

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
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
    </div>
  );
}
