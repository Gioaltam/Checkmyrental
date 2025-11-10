/**
 * Seasonality Analysis
 * Analyzes property issues by season and provides readiness scores
 */

import { PropertyData, ReportData } from './portfolio-analytics';

export interface MonthlyIssueData {
  month: string; // e.g., "Jan 2024"
  monthNum: number; // 0-11
  year: number;
  critical: number;
  important: number;
  total: number;
}

export interface SeasonalPattern {
  season: 'winter' | 'spring' | 'summer' | 'fall';
  months: string[];
  avgCritical: number;
  avgImportant: number;
  totalIssues: number;
  topIssueTypes: string[];
}

export interface PreemptiveTask {
  id: string;
  title: string;
  description: string;
  season: 'winter' | 'spring' | 'summer' | 'fall';
  urgency: 'high' | 'medium' | 'low';
  dueDate: Date;
  category: 'hvac' | 'plumbing' | 'electrical' | 'structural' | 'general';
}

export interface SeasonReadiness {
  season: 'winter' | 'spring' | 'summer' | 'fall';
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  tasks: PreemptiveTask[];
  daysUntil: number;
}

/**
 * Get season from month number (0-11)
 */
function getSeasonFromMonth(month: number): 'winter' | 'spring' | 'summer' | 'fall' {
  if (month >= 11 || month <= 1) return 'winter'; // Dec, Jan, Feb
  if (month >= 2 && month <= 4) return 'spring'; // Mar, Apr, May
  if (month >= 5 && month <= 7) return 'summer'; // Jun, Jul, Aug
  return 'fall'; // Sep, Oct, Nov
}

/**
 * Get season name
 */
function getSeasonName(season: 'winter' | 'spring' | 'summer' | 'fall'): string {
  const names = {
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall'
  };
  return names[season];
}

/**
 * Get upcoming season (next 90 days)
 */
export function getUpcomingSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
  return getSeasonFromMonth(futureDate.getMonth());
}

/**
 * Get days until next season
 */
export function getDaysUntilSeason(targetSeason: 'winter' | 'spring' | 'summer' | 'fall'): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentSeason = getSeasonFromMonth(currentMonth);

  if (currentSeason === targetSeason) return 0;

  // Season start months (approximate)
  const seasonStarts: Record<string, number> = {
    winter: 11, // December
    spring: 2,  // March
    summer: 5,  // June
    fall: 8     // September
  };

  let targetMonth = seasonStarts[targetSeason];
  let targetYear = now.getFullYear();

  // If target month is before current month, it's next year
  if (targetMonth <= currentMonth) {
    targetYear++;
  }

  const targetDate = new Date(targetYear, targetMonth, 1);
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Stack issues by month from historical data
 */
export function stackIssuesByMonth(properties: PropertyData[]): MonthlyIssueData[] {
  const monthlyData: Record<string, MonthlyIssueData> = {};

  properties.forEach(property => {
    property.reports.forEach(report => {
      const date = new Date(report.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          monthNum: date.getMonth(),
          year: date.getFullYear(),
          critical: 0,
          important: 0,
          total: 0
        };
      }

      monthlyData[monthKey].critical += report.criticalIssues || 0;
      monthlyData[monthKey].important += report.importantIssues || 0;
      monthlyData[monthKey].total += (report.criticalIssues || 0) + (report.importantIssues || 0);
    });
  });

  // Convert to array and sort by date
  return Object.values(monthlyData).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthNum - b.monthNum;
  });
}

/**
 * Analyze seasonal patterns from historical data
 */
export function analyzeSeasonalPatterns(monthlyData: MonthlyIssueData[]): SeasonalPattern[] {
  const seasonData: Record<string, { critical: number[]; important: number[]; months: string[] }> = {
    winter: { critical: [], important: [], months: [] },
    spring: { critical: [], important: [], months: [] },
    summer: { critical: [], important: [], months: [] },
    fall: { critical: [], important: [], months: [] }
  };

  monthlyData.forEach(data => {
    const season = getSeasonFromMonth(data.monthNum);
    seasonData[season].critical.push(data.critical);
    seasonData[season].important.push(data.important);
    seasonData[season].months.push(data.month);
  });

  // Calculate averages and create patterns
  const patterns: SeasonalPattern[] = [];

  (['winter', 'spring', 'summer', 'fall'] as const).forEach(season => {
    const data = seasonData[season];
    const avgCritical = data.critical.length > 0
      ? data.critical.reduce((a, b) => a + b, 0) / data.critical.length
      : 0;
    const avgImportant = data.important.length > 0
      ? data.important.reduce((a, b) => a + b, 0) / data.important.length
      : 0;

    patterns.push({
      season,
      months: data.months,
      avgCritical,
      avgImportant,
      totalIssues: data.critical.reduce((a, b) => a + b, 0) + data.important.reduce((a, b) => a + b, 0),
      topIssueTypes: getTopIssueTypesForSeason(season)
    });
  });

  return patterns;
}

/**
 * Get typical issue types for each season
 */
function getTopIssueTypesForSeason(season: 'winter' | 'spring' | 'summer' | 'fall'): string[] {
  const issuesByPeason: Record<string, string[]> = {
    winter: ['HVAC heating', 'Frozen pipes', 'Ice dam damage', 'Drafts & insulation'],
    spring: ['Roof leaks', 'Water drainage', 'Mold & moisture', 'Landscaping'],
    summer: ['HVAC cooling', 'High energy bills', 'Pest control', 'AC overload'],
    fall: ['Gutter cleaning', 'Heating prep', 'Weather sealing', 'Tree maintenance']
  };

  return issuesByPeason[season] || [];
}

/**
 * Generate preemptive tasks for upcoming season
 */
export function generatePreemptiveTasks(
  upcomingSeason: 'winter' | 'spring' | 'summer' | 'fall',
  properties: PropertyData[],
  daysUntilSeason: number
): PreemptiveTask[] {
  const tasks: PreemptiveTask[] = [];
  const baseDate = new Date();

  // Get properties with recent issues that need seasonal prep
  const propertiesNeedingPrep = properties.filter(p => {
    const recentReports = p.reports.filter(r => {
      const reportDate = new Date(r.date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return reportDate >= sixMonthsAgo;
    });
    return recentReports.length > 0;
  });

  // Season-specific tasks
  const seasonalTasks: Record<string, Array<Omit<PreemptiveTask, 'id' | 'dueDate'>>> = {
    winter: [
      {
        title: 'HVAC Heating System Check',
        description: 'Inspect furnace, replace filters, test thermostat before cold weather',
        season: 'winter',
        urgency: 'high',
        category: 'hvac'
      },
      {
        title: 'Winterize Plumbing',
        description: 'Insulate pipes, drain outdoor faucets, check for drafts',
        season: 'winter',
        urgency: 'high',
        category: 'plumbing'
      },
      {
        title: 'Weatherproofing Inspection',
        description: 'Check window seals, door sweeps, and attic insulation',
        season: 'winter',
        urgency: 'medium',
        category: 'structural'
      }
    ],
    spring: [
      {
        title: 'Roof & Gutter Inspection',
        description: 'Check for winter damage, clean gutters, inspect for leaks',
        season: 'spring',
        urgency: 'high',
        category: 'structural'
      },
      {
        title: 'AC System Tune-Up',
        description: 'Service AC unit, replace filters, check refrigerant levels',
        season: 'spring',
        urgency: 'medium',
        category: 'hvac'
      },
      {
        title: 'Drainage & Foundation Check',
        description: 'Ensure proper water drainage away from foundation',
        season: 'spring',
        urgency: 'medium',
        category: 'structural'
      }
    ],
    summer: [
      {
        title: 'AC Efficiency Review',
        description: 'Optimize AC settings, check for high energy usage, inspect ducts',
        season: 'summer',
        urgency: 'high',
        category: 'hvac'
      },
      {
        title: 'Pest Prevention',
        description: 'Seal entry points, schedule pest control, check for infestations',
        season: 'summer',
        urgency: 'medium',
        category: 'general'
      },
      {
        title: 'Outdoor Systems Check',
        description: 'Inspect outdoor electrical, lighting, and irrigation systems',
        season: 'summer',
        urgency: 'low',
        category: 'electrical'
      }
    ],
    fall: [
      {
        title: 'Gutter Cleaning & Prep',
        description: 'Remove leaves, check downspouts, prepare for winter',
        season: 'fall',
        urgency: 'high',
        category: 'structural'
      },
      {
        title: 'Heating System Maintenance',
        description: 'Service furnace, replace filters, test heating before winter',
        season: 'fall',
        urgency: 'high',
        category: 'hvac'
      },
      {
        title: 'Weather Sealing',
        description: 'Caulk windows, seal gaps, prepare for cold weather',
        season: 'fall',
        urgency: 'medium',
        category: 'structural'
      }
    ]
  };

  // Add tasks for upcoming season
  const tasksForSeason = seasonalTasks[upcomingSeason] || [];
  tasksForSeason.forEach((taskTemplate, index) => {
    // Calculate due date (should be done before season starts)
    const daysBeforeSeason = Math.max(14, Math.min(daysUntilSeason - 7, 30));
    const dueDate = new Date(baseDate.getTime() + daysBeforeSeason * 24 * 60 * 60 * 1000);

    tasks.push({
      ...taskTemplate,
      id: `seasonal-${upcomingSeason}-${index}`,
      dueDate
    });
  });

  return tasks.sort((a, b) => {
    // Sort by urgency first, then by due date
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

/**
 * Calculate season readiness score (0-100)
 */
export function calculateSeasonReadiness(
  properties: PropertyData[],
  upcomingSeason: 'winter' | 'spring' | 'summer' | 'fall'
): SeasonReadiness {
  const daysUntil = getDaysUntilSeason(upcomingSeason);
  const tasks = generatePreemptiveTasks(upcomingSeason, properties, daysUntil);

  // Score factors
  let score = 100;

  // Check for recent inspections (last 90 days)
  const recentInspections = properties.filter(p => {
    const latestReport = p.reports[0];
    if (!latestReport) return false;
    const reportDate = new Date(latestReport.date);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return reportDate >= ninetyDaysAgo;
  }).length;

  const inspectionRatio = properties.length > 0 ? recentInspections / properties.length : 0;

  // Reduce score based on inspection coverage
  if (inspectionRatio < 0.3) score -= 40; // Less than 30% inspected
  else if (inspectionRatio < 0.6) score -= 20; // Less than 60% inspected
  else if (inspectionRatio < 0.9) score -= 10; // Less than 90% inspected

  // Check for open critical issues
  const criticalIssues = properties.reduce((sum, p) => {
    const latest = p.reports[0];
    return sum + (latest?.criticalIssues || 0);
  }, 0);

  score -= Math.min(criticalIssues * 10, 40); // -10 per critical, max -40

  // Check for open important issues
  const importantIssues = properties.reduce((sum, p) => {
    const latest = p.reports[0];
    return sum + (latest?.importantIssues || 0);
  }, 0);

  score -= Math.min(importantIssues * 5, 20); // -5 per important, max -20

  // Ensure score is within 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 90) status = 'excellent';
  else if (score >= 75) status = 'good';
  else if (score >= 60) status = 'fair';
  else status = 'poor';

  return {
    season: upcomingSeason,
    score,
    status,
    tasks,
    daysUntil
  };
}