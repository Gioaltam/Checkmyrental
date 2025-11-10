/**
 * Florida Seasonal Awareness System
 *
 * Calculates current season, risk levels, and maintenance tasks
 * based on Florida's unique climate challenges (hurricanes, humidity, etc.)
 */

export interface SeasonData {
  name: string;
  icon: string;
  riskLevel: number; // 0-100
  riskText: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskColor: string;
  daysUntilNext: number;
  nextSeasonName: string;
  temperature: string;
  humidity: string;
  rainfall: string;
  historicalNote: string;
  mainWarning: string;
}

interface SeasonDefinition {
  name: string;
  start: { month: number; day: number };
  end: { month: number; day: number };
  icon: string;
  riskLevel: number;
  riskText: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  temperature: string;
  humidity: string;
  rainfall: string;
  historicalNote: string;
  mainWarning: string;
}

// Florida seasonal definitions (static calendar-based)
const SEASONS: SeasonDefinition[] = [
  {
    name: "Peak Hurricane Season",
    start: { month: 8, day: 1 },
    end: { month: 10, day: 31 },
    icon: "🌀",
    riskLevel: 95,
    riskText: "CRITICAL",
    temperature: "80-92°F",
    humidity: "75-85%",
    rainfall: "8-10 inches/month",
    historicalNote: "60% of major hurricanes hit Florida during this period",
    mainWarning: "Verify storm shutters and drainage systems"
  },
  {
    name: "Early Hurricane Season",
    start: { month: 6, day: 1 },
    end: { month: 7, day: 31 },
    icon: "🌪️",
    riskLevel: 70,
    riskText: "HIGH",
    temperature: "82-90°F",
    humidity: "70-80%",
    rainfall: "6-8 inches/month",
    historicalNote: "Atlantic hurricane season officially begins June 1",
    mainWarning: "Review hurricane preparedness plan"
  },
  {
    name: "Late Hurricane Season",
    start: { month: 11, day: 1 },
    end: { month: 11, day: 30 },
    icon: "🌊",
    riskLevel: 45,
    riskText: "MEDIUM",
    temperature: "70-80°F",
    humidity: "65-75%",
    rainfall: "3-4 inches/month",
    historicalNote: "Hurricane season ends November 30",
    mainWarning: "Document any storm damage and schedule repairs"
  },
  {
    name: "Dry Season",
    start: { month: 12, day: 1 },
    end: { month: 4, day: 30 },
    icon: "☀️",
    riskLevel: 15,
    riskText: "LOW",
    temperature: "65-78°F",
    humidity: "55-65%",
    rainfall: "2-3 inches/month",
    historicalNote: "Best time for exterior work and repairs",
    mainWarning: "Complete exterior maintenance and pre-hurricane prep"
  },
  {
    name: "Pre-Hurricane Prep Season",
    start: { month: 5, day: 1 },
    end: { month: 5, day: 31 },
    icon: "⚠️",
    riskLevel: 35,
    riskText: "MEDIUM",
    temperature: "75-85°F",
    humidity: "65-75%",
    rainfall: "4-5 inches/month",
    historicalNote: "Wet season transition begins",
    mainWarning: "Complete final pre-hurricane preparations"
  }
];

/**
 * Get current date with time set to midnight for comparison
 */
function getDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Compare if date is within season bounds
 */
function isDateInSeason(date: Date, season: SeasonDefinition): boolean {
  const year = date.getFullYear();
  const startDate = new Date(year, season.start.month - 1, season.start.day);
  const endDate = new Date(year, season.end.month - 1, season.end.day);

  return date >= startDate && date <= endDate;
}

/**
 * Get the next season start date
 */
function getNextSeasonStart(currentDate: Date, currentSeason: SeasonDefinition): Date {
  const year = currentDate.getFullYear();
  const endDate = new Date(year, currentSeason.end.month - 1, currentSeason.end.day);

  // Next day after current season ends
  const nextDay = new Date(endDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // If next day is next year, adjust
  if (nextDay.getFullYear() > year) {
    return new Date(nextDay.getFullYear(), 0, 1); // January 1 of next year
  }

  return nextDay;
}

/**
 * Find next season after current one
 */
function getNextSeason(currentSeason: SeasonDefinition): SeasonDefinition {
  const currentIndex = SEASONS.findIndex(s => s.name === currentSeason.name);
  return SEASONS[(currentIndex + 1) % SEASONS.length];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Get current Florida season based on date
 */
export function getCurrentSeason(date: Date = new Date()): SeasonData {
  const dateOnly = getDateOnly(date);

  // Find matching season
  let currentSeasonDef = SEASONS.find(season => isDateInSeason(dateOnly, season));

  // Default to Dry Season if no match (shouldn't happen with proper definitions)
  if (!currentSeasonDef) {
    currentSeasonDef = SEASONS[3]; // Dry Season
  }

  // Get next season info
  const nextSeason = getNextSeason(currentSeasonDef);
  const nextSeasonStart = getNextSeasonStart(dateOnly, currentSeasonDef);
  const daysUntilNext = daysBetween(dateOnly, nextSeasonStart);

  return {
    name: currentSeasonDef.name,
    icon: currentSeasonDef.icon,
    riskLevel: currentSeasonDef.riskLevel,
    riskText: currentSeasonDef.riskText,
    riskColor: getRiskColor(currentSeasonDef.riskLevel),
    daysUntilNext,
    nextSeasonName: nextSeason.name,
    temperature: currentSeasonDef.temperature,
    humidity: currentSeasonDef.humidity,
    rainfall: currentSeasonDef.rainfall,
    historicalNote: currentSeasonDef.historicalNote,
    mainWarning: currentSeasonDef.mainWarning
  };
}

/**
 * Get color gradient for risk level
 */
export function getRiskColor(riskLevel: number): string {
  if (riskLevel >= 76) {
    return "from-red-500 to-red-600"; // CRITICAL
  } else if (riskLevel >= 51) {
    return "from-orange-500 to-orange-600"; // HIGH
  } else if (riskLevel >= 26) {
    return "from-yellow-500 to-yellow-600"; // MEDIUM
  } else {
    return "from-green-500 to-green-600"; // LOW
  }
}

/**
 * Get border color for risk level
 */
export function getRiskBorderColor(riskLevel: number): string {
  if (riskLevel >= 76) {
    return "border-red-500/30"; // CRITICAL
  } else if (riskLevel >= 51) {
    return "border-orange-500/30"; // HIGH
  } else if (riskLevel >= 26) {
    return "border-yellow-500/30"; // MEDIUM
  } else {
    return "border-green-500/30"; // LOW
  }
}

/**
 * Get text color for risk level
 */
export function getRiskTextColor(riskLevel: number): string {
  if (riskLevel >= 76) {
    return "text-red-400"; // CRITICAL
  } else if (riskLevel >= 51) {
    return "text-orange-400"; // HIGH
  } else if (riskLevel >= 26) {
    return "text-yellow-400"; // MEDIUM
  } else {
    return "text-green-400"; // LOW
  }
}

/**
 * Get background glow color for risk level
 */
export function getRiskGlowColor(riskLevel: number): string {
  if (riskLevel >= 76) {
    return "shadow-red-500/20"; // CRITICAL
  } else if (riskLevel >= 51) {
    return "shadow-orange-500/20"; // HIGH
  } else if (riskLevel >= 26) {
    return "shadow-yellow-500/20"; // MEDIUM
  } else {
    return "shadow-green-500/20"; // LOW
  }
}
