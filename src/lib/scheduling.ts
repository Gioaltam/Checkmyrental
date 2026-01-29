// Zone-aware scheduling logic for travel time optimization

import type { Booking } from './types';
import { extractZipcode, getServiceZone, getTravelTime, type ServiceZone } from './zones';

export interface TimeSlot {
  time: string; // HH:MM format
  available: boolean;
  reason?: string;
}

export interface BookingWithZone {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  serviceZone: ServiceZone;
  propertyAddress: string;
  slotDuration: number; // in minutes
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 * @param start1 Start of first range in minutes
 * @param end1 End of first range in minutes
 * @param start2 Start of second range in minutes
 * @param end2 End of second range in minutes
 */
function rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a time slot is available considering existing bookings and travel time
 *
 * @param slotTime The proposed slot time (HH:MM)
 * @param slotDuration Duration of the inspection in minutes
 * @param propertyZone Zone of the property being booked
 * @param existingBookings Other bookings on the same day
 * @returns Object with availability status and reason if unavailable
 */
export function checkSlotAvailability(
  slotTime: string,
  slotDuration: number,
  propertyZone: ServiceZone,
  existingBookings: BookingWithZone[]
): { available: boolean; reason?: string } {
  const slotStartMinutes = timeToMinutes(slotTime);
  const slotEndMinutes = slotStartMinutes + slotDuration;

  for (const booking of existingBookings) {
    const bookingStartMinutes = timeToMinutes(booking.scheduledTime);
    const bookingEndMinutes = bookingStartMinutes + booking.slotDuration;

    // Get travel time between the two zones
    const travelTimeToBooking = getTravelTime(propertyZone, booking.serviceZone);
    const travelTimeFromBooking = getTravelTime(booking.serviceZone, propertyZone);

    // Calculate the required buffer zones
    // If new slot is BEFORE existing booking: need travel time after new slot ends
    // If new slot is AFTER existing booking: need travel time after existing booking ends

    // Check if new slot ends too close to existing booking start
    // New slot ends at slotEndMinutes, existing booking starts at bookingStartMinutes
    // Need: slotEndMinutes + travelTimeToBooking <= bookingStartMinutes
    const canFitBefore = slotEndMinutes + travelTimeToBooking <= bookingStartMinutes;

    // Check if new slot starts too close to existing booking end
    // Existing booking ends at bookingEndMinutes, new slot starts at slotStartMinutes
    // Need: bookingEndMinutes + travelTimeFromBooking <= slotStartMinutes
    const canFitAfter = bookingEndMinutes + travelTimeFromBooking <= slotStartMinutes;

    // Also check for direct time overlap (regardless of travel)
    const hasTimeOverlap = rangesOverlap(slotStartMinutes, slotEndMinutes, bookingStartMinutes, bookingEndMinutes);

    if (hasTimeOverlap) {
      return {
        available: false,
        reason: `Conflicts with booking at ${booking.scheduledTime}`,
      };
    }

    // If slot doesn't fit before OR after the existing booking, it's unavailable
    if (!canFitBefore && !canFitAfter) {
      const zoneName = booking.serviceZone === propertyZone ? 'same area' : booking.serviceZone;
      return {
        available: false,
        reason: `Travel time conflict with ${zoneName} booking at ${booking.scheduledTime} (${travelTimeToBooking} min travel)`,
      };
    }
  }

  return { available: true };
}

/**
 * Filter a list of potential time slots based on existing bookings and travel requirements
 *
 * @param potentialSlots Array of time strings (HH:MM)
 * @param slotDuration Duration of each inspection in minutes
 * @param propertyAddress Address of the property being booked
 * @param existingBookings Other bookings on the same day
 * @returns Array of TimeSlot objects with availability status
 */
export function filterSlotsWithTravel(
  potentialSlots: string[],
  slotDuration: number,
  propertyAddress: string,
  existingBookings: Booking[]
): TimeSlot[] {
  // Determine the zone for the property being booked
  const zipcode = extractZipcode(propertyAddress);
  const propertyZone = getServiceZone(zipcode);

  // Convert existing bookings to BookingWithZone format
  const bookingsWithZone: BookingWithZone[] = existingBookings
    .filter(b => b.scheduledDate && b.scheduledTime && b.status === 'scheduled')
    .map(b => ({
      id: b.id,
      scheduledDate: b.scheduledDate!,
      scheduledTime: b.scheduledTime!,
      serviceZone: (b.serviceZone as ServiceZone) || getServiceZone(extractZipcode(b.propertyAddress)),
      propertyAddress: b.propertyAddress,
      slotDuration: slotDuration, // Assume same duration for all
    }));

  // Check each potential slot
  return potentialSlots.map(time => {
    const result = checkSlotAvailability(time, slotDuration, propertyZone, bookingsWithZone);
    return {
      time,
      available: result.available,
      reason: result.reason,
    };
  });
}

/**
 * Calculate total travel time for a day's route
 *
 * @param bookings Array of bookings sorted by time
 * @param startZone Zone where the inspector starts (default: first booking's zone)
 * @returns Total travel time in minutes
 */
export function calculateDayTravelTime(
  bookings: BookingWithZone[],
  startZone?: ServiceZone
): number {
  if (bookings.length === 0) return 0;
  if (bookings.length === 1) return 0;

  // Sort bookings by time
  const sortedBookings = [...bookings].sort((a, b) =>
    timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime)
  );

  let totalTravel = 0;
  let currentZone = startZone ?? sortedBookings[0].serviceZone;

  for (const booking of sortedBookings) {
    totalTravel += getTravelTime(currentZone, booking.serviceZone);
    currentZone = booking.serviceZone;
  }

  return totalTravel;
}

/**
 * Evaluate route efficiency
 * @returns 'good' | 'fair' | 'poor' based on travel time vs inspection time ratio
 */
export function evaluateRouteEfficiency(
  bookings: BookingWithZone[],
  slotDuration: number
): 'good' | 'fair' | 'poor' {
  if (bookings.length <= 1) return 'good';

  const totalTravelTime = calculateDayTravelTime(bookings);
  const totalInspectionTime = bookings.length * slotDuration;
  const ratio = totalTravelTime / totalInspectionTime;

  // If travel time is less than 50% of inspection time, it's good
  if (ratio < 0.5) return 'good';
  // If travel time is less than inspection time, it's fair
  if (ratio < 1.0) return 'fair';
  // Otherwise, it's poor
  return 'poor';
}

/**
 * Get a human-readable route summary for a day
 */
export function getRouteSummary(bookings: BookingWithZone[], slotDuration: number): {
  totalBookings: number;
  totalTravelMinutes: number;
  totalInspectionMinutes: number;
  efficiency: 'good' | 'fair' | 'poor';
  zones: ServiceZone[];
} {
  const sortedBookings = [...bookings].sort((a, b) =>
    timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime)
  );

  return {
    totalBookings: bookings.length,
    totalTravelMinutes: calculateDayTravelTime(sortedBookings),
    totalInspectionMinutes: bookings.length * slotDuration,
    efficiency: evaluateRouteEfficiency(sortedBookings, slotDuration),
    zones: sortedBookings.map(b => b.serviceZone),
  };
}
