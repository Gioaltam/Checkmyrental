// Service zone definitions and travel time matrix for Tampa Bay area

export type ServiceZone = 'TAMPA' | 'NORTH' | 'CENTRAL' | 'SOUTH' | 'EAST' | 'UNKNOWN';

export interface ZoneDefinition {
  id: ServiceZone;
  name: string;
  areas: string[];
  zipRanges: Array<{ start: number; end: number }>;
  individualZips: number[];
}

// Service zones covering Tampa Bay area
export const SERVICE_ZONES: ZoneDefinition[] = [
  {
    id: 'TAMPA',
    name: 'Tampa / Hillsborough',
    areas: ['Tampa', 'Brandon', 'Temple Terrace', 'Riverview', 'Carrollwood'],
    zipRanges: [{ start: 33601, end: 33647 }],
    individualZips: [33549, 33556, 33558, 33510, 33511, 33534, 33569, 33578, 33579, 33584, 33594, 33596],
  },
  {
    id: 'NORTH',
    name: 'North Pinellas',
    areas: ['Palm Harbor', 'Tarpon Springs', 'Dunedin', 'Oldsmar', 'East Lake'],
    zipRanges: [{ start: 34683, end: 34698 }],
    individualZips: [34677, 34679, 34681, 34682],
  },
  {
    id: 'CENTRAL',
    name: 'Central Pinellas',
    areas: ['Clearwater', 'Clearwater Beach', 'Safety Harbor', 'Belleair'],
    zipRanges: [{ start: 33755, end: 33767 }],
    individualZips: [34695, 33756, 33759, 33761, 33764, 33765],
  },
  {
    id: 'SOUTH',
    name: 'South Pinellas',
    areas: ['St. Petersburg', 'Gulfport', 'Treasure Island', 'St. Pete Beach', 'Madeira Beach'],
    zipRanges: [{ start: 33701, end: 33747 }],
    individualZips: [33706, 33707, 33708, 33709, 33710, 33711, 33712, 33713, 33714, 33715, 33716],
  },
  {
    id: 'EAST',
    name: 'Mid Pinellas',
    areas: ['Largo', 'Seminole', 'Pinellas Park', 'Kenneth City', 'Bardmoor'],
    zipRanges: [{ start: 33770, end: 33786 }],
    individualZips: [33760, 33762, 33763, 33764, 33772, 33773, 33774, 33776, 33777, 33778, 33781, 33782],
  },
];

// Travel time matrix between zones (in minutes)
// Accounts for typical traffic conditions
export const ZONE_TRAVEL_MATRIX: Record<ServiceZone, Record<ServiceZone, number>> = {
  TAMPA: {
    TAMPA: 20,
    NORTH: 45,
    CENTRAL: 35,
    SOUTH: 45,
    EAST: 40,
    UNKNOWN: 60, // Conservative estimate for unknown zones
  },
  NORTH: {
    TAMPA: 45,
    NORTH: 15,
    CENTRAL: 25,
    SOUTH: 45,
    EAST: 30,
    UNKNOWN: 45,
  },
  CENTRAL: {
    TAMPA: 35,
    NORTH: 25,
    CENTRAL: 15,
    SOUTH: 30,
    EAST: 20,
    UNKNOWN: 35,
  },
  SOUTH: {
    TAMPA: 45,
    NORTH: 45,
    CENTRAL: 30,
    SOUTH: 15,
    EAST: 25,
    UNKNOWN: 40,
  },
  EAST: {
    TAMPA: 40,
    NORTH: 30,
    CENTRAL: 20,
    SOUTH: 25,
    EAST: 15,
    UNKNOWN: 35,
  },
  UNKNOWN: {
    TAMPA: 60,
    NORTH: 45,
    CENTRAL: 35,
    SOUTH: 40,
    EAST: 35,
    UNKNOWN: 30,
  },
};

/**
 * Extract ZIP code from an address string
 */
export function extractZipcode(address: string): string | null {
  // Match 5-digit ZIP code, optionally with 4-digit extension
  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : null;
}

/**
 * Determine which service zone a ZIP code belongs to
 */
export function getServiceZone(zipcode: string | null): ServiceZone {
  if (!zipcode) return 'UNKNOWN';

  const zip = parseInt(zipcode, 10);
  if (isNaN(zip)) return 'UNKNOWN';

  for (const zone of SERVICE_ZONES) {
    // Check if ZIP is in any of the ranges
    for (const range of zone.zipRanges) {
      if (zip >= range.start && zip <= range.end) {
        return zone.id;
      }
    }
    // Check if ZIP is in the individual list
    if (zone.individualZips.includes(zip)) {
      return zone.id;
    }
  }

  return 'UNKNOWN';
}

/**
 * Get travel time between two zones in minutes
 */
export function getTravelTime(fromZone: ServiceZone, toZone: ServiceZone): number {
  return ZONE_TRAVEL_MATRIX[fromZone]?.[toZone] ?? 60; // Default to 60 min if not found
}

/**
 * Get zone definition by ID
 */
export function getZoneDefinition(zoneId: ServiceZone): ZoneDefinition | undefined {
  return SERVICE_ZONES.find(zone => zone.id === zoneId);
}

/**
 * Get human-readable zone name
 */
export function getZoneName(zoneId: ServiceZone): string {
  const zone = getZoneDefinition(zoneId);
  return zone?.name ?? 'Unknown Area';
}
