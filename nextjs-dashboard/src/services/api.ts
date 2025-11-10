/**
 * API Service Layer
 *
 * Centralized API calls for the owner dashboard.
 * Makes it easy to switch between mock data and live API,
 * and ensures consistent data fetching across the app.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

export interface Report {
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

export interface Photo {
  url: string;
  reportId?: string;
}

export interface Property {
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

export interface DashboardData {
  owner?: string;
  full_name?: string;
  email?: string;
  client_id?: string;
  reports?: Report[];
}

export interface PhotoAnalysis {
  location: string;
  severity: 'critical' | 'moderate' | 'low' | 'normal';
  observations: string[];
  potential_issues: string[];
  potentialIssues?: string[];
  recommendations: string[];
  note?: string;
  error?: boolean;
  message?: string;
}

/**
 * Fetch dashboard data for an owner
 */
export async function fetchDashboardData(token: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/portal/dashboard?portal_token=${token}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

/**
 * Fetch reports list for an owner
 */
export async function fetchReports(ownerId: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/reports/list?owner_id=${ownerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }
  return response.json();
}

/**
 * Fetch photos for a property
 */
export async function fetchPropertyPhotos(propertyAddress: string): Promise<{ items?: Photo[], photos?: Photo[] }> {
  const response = await fetch(`${API_BASE}/api/photos/property/${encodeURIComponent(propertyAddress)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch property photos');
  }
  return response.json();
}

/**
 * Fetch report content (HTML)
 */
export async function fetchReportContent(reportId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/simple/simple/${reportId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch report content');
  }
  return response.text();
}

/**
 * Fetch photo analysis
 */
export async function fetchPhotoAnalysis(reportId: string, photoFilename: string): Promise<PhotoAnalysis> {
  const response = await fetch(`${API_BASE}/api/photo-report/${reportId}/${photoFilename}/json`);
  if (!response.ok) {
    throw new Error('Failed to fetch photo analysis');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    location: data.location,
    severity: data.severity,
    observations: data.observations || [],
    potential_issues: data.potential_issues || [],
    potentialIssues: data.potential_issues || [],
    recommendations: data.recommendations || [],
    note: data.note,
  };
}

/**
 * Process reports data into properties
 */
export async function processReportsIntoProperties(reports: Report[]): Promise<Property[]> {
  const propertyMap = new Map<string, Property>();

  // Group reports by property
  reports.forEach((report) => {
    if (!propertyMap.has(report.property)) {
      propertyMap.set(report.property, {
        id: report.property.replace(/\s+/g, '-').toLowerCase(),
        name: report.property.split(",")[0] || report.property,
        address: report.property,
        reports: [],
        photos: [],
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
      const photosData = await fetchPropertyPhotos(address);
      const photoItems = photosData.items || photosData.photos || [];

      if (photoItems.length > 0) {
        property.photos = photoItems.map((p: any) => {
          const photoUrl = p.url.startsWith('http') ? p.url : `${API_BASE}${p.url}`;
          const urlParts = p.url.split('/');
          const extractedReportId = urlParts[4] || property.latestReport?.id;

          return {
            url: photoUrl,
            reportId: p.reportId || extractedReportId,
          };
        });
      }

      // Set cover URL to first photo
      property.coverUrl = property.photos[0]?.url;
    } catch (err) {
      console.error(`Failed to fetch photos for ${address}:`, err);
      property.photos = [];
    }
  }

  return Array.from(propertyMap.values());
}

/**
 * Get owner theme configuration
 */
export async function fetchOwnerTheme(ownerId: string) {
  // TODO: Implement backend endpoint
  // const response = await fetch(`${API_BASE}/api/owners/${ownerId}/theme`);
  // return response.json();

  // For now, return null to use default theme
  return null;
}

/**
 * Seasonal Tasks API
 */
export interface SeasonalTask {
  id: string;
  task_key: string;
  task_name: string;
  month: number;
  completed: boolean;
  completed_at: string | null;
  year: number;
}

/**
 * Fetch seasonal tasks for a client and month
 */
export async function fetchSeasonalTasks(
  clientId: string,
  month?: number,
  year?: number
): Promise<SeasonalTask[]> {
  const currentMonth = month ?? new Date().getMonth() + 1;
  const currentYear = year ?? new Date().getFullYear();

  const response = await fetch(
    `${API_BASE}/api/seasonal-tasks?client_id=${clientId}&month=${currentMonth}&year=${currentYear}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch seasonal tasks');
  }

  return response.json();
}

/**
 * Toggle completion status of a seasonal task
 */
export async function toggleSeasonalTask(
  clientId: string,
  taskKey: string,
  completed: boolean,
  year: number,
  month: number
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/seasonal-tasks/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      task_key: taskKey,
      completed,
      year,
      month,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to toggle seasonal task');
  }

  return response.json();
}

/**
 * Get completion status for all tasks in a year
 */
export async function getSeasonalTaskStatus(
  clientId: string,
  year?: number
): Promise<{ task_status: Record<string, boolean>; total_tasks: number; completed_tasks: number }> {
  const currentYear = year ?? new Date().getFullYear();

  const response = await fetch(
    `${API_BASE}/api/seasonal-tasks/status?client_id=${clientId}&year=${currentYear}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch seasonal task status');
  }

  return response.json();
}
