// Get available booking time slots for a specific date
import type { APIRoute } from 'astro';
import { getBookingByToken, getAvailability, getBookedSlotsForDate, getBookingsForDate } from '../../../lib/db';
import type { TimeSlot, Booking } from '../../../lib/types';
import { filterSlotsWithTravel, isPreferredZone, getDailyCapacity } from '../../../lib/scheduling';
import { extractZipcode, getServiceZone, isZoneAllowedOnDay } from '../../../lib/zones';

export const prerender = false;

// Generate time slots for a given day based on availability schedule
function generateTimeSlots(
  date: string,
  dayOfWeek: number,
  schedule: Awaited<ReturnType<typeof getAvailability>>,
  bookedSlots: string[],
  minAdvanceHours: number,
  propertyAddress?: string,
  existingBookings?: Booking[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();

  // Find the schedule for this day of week
  const daySchedule = schedule.weeklySlots.find(
    s => s.dayOfWeek === dayOfWeek
  );

  if (!daySchedule) {
    return []; // No availability for this day
  }

  // Check if date is blocked
  if (schedule.blockedDates.includes(date)) {
    return []; // Date is blocked
  }

  // Parse start and end times
  const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
  const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
  const slotDuration = schedule.slotDuration || 60;

  // Generate all potential slot times first
  const potentialSlots: string[] = [];
  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    // Calculate end time of this slot
    let endSlotMin = currentMin + slotDuration;
    let endSlotHour = currentHour;
    while (endSlotMin >= 60) {
      endSlotMin -= 60;
      endSlotHour++;
    }

    // Don't create slot if it extends beyond working hours
    if (endSlotHour > endHour || (endSlotHour === endHour && endSlotMin > endMin)) {
      break;
    }

    potentialSlots.push(startTime);

    // Move to next slot
    currentMin += slotDuration;
    while (currentMin >= 60) {
      currentMin -= 60;
      currentHour++;
    }
  }

  // Apply zone-aware filtering if enabled and we have the necessary data
  const enableZoneFiltering = schedule.enableZoneFiltering !== false; // Default to true
  let zoneFilteredSlots: Map<string, { available: boolean; reason?: string }> = new Map();

  if (enableZoneFiltering && propertyAddress && existingBookings && existingBookings.length > 0) {
    const filtered = filterSlotsWithTravel(
      potentialSlots,
      slotDuration,
      propertyAddress,
      existingBookings,
      schedule.travelBufferMinutes || 0
    );
    filtered.forEach(slot => {
      zoneFilteredSlots.set(slot.time, { available: slot.available, reason: slot.reason });
    });
  }

  // Check if this property's zone matches existing bookings (for preferred marking)
  const isPreferred = propertyAddress && existingBookings && existingBookings.length > 0
    ? isPreferredZone(propertyAddress, existingBookings)
    : false;

  // Build final slots array
  for (const startTime of potentialSlots) {
    // Calculate end time
    const [sh, sm] = startTime.split(':').map(Number);
    let endSlotMin = sm + slotDuration;
    let endSlotHour = sh;
    while (endSlotMin >= 60) {
      endSlotMin -= 60;
      endSlotHour++;
    }
    const endTime = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`;

    // Check if slot is within minimum advance time
    const slotDateTime = new Date(`${date}T${startTime}:00`);
    const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithinMinAdvance = hoursUntilSlot >= minAdvanceHours;

    // Check if slot is already booked (direct time conflict)
    const isBooked = bookedSlots.includes(startTime);

    // Check zone-based availability
    const zoneFilter = zoneFilteredSlots.get(startTime);
    const isZoneAvailable = !zoneFilter || zoneFilter.available;

    const isAvailable = isWithinMinAdvance && !isBooked && isZoneAvailable;

    slots.push({
      date,
      startTime,
      endTime,
      available: isAvailable,
      // Mark as preferred if available and in same zone as existing bookings
      preferred: isAvailable && isPreferred,
    });
  }

  return slots;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    const date = url.searchParams.get('date');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Booking token required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate booking exists and is pending
    const booking = await getBookingByToken(token);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Invalid booking token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isReschedule = url.searchParams.get('reschedule') === 'true';
    const allowedStatuses = isReschedule
      ? ['pending_tenant', 'scheduled']
      : ['pending_tenant'];

    if (!allowedStatuses.includes(booking.status)) {
      return new Response(
        JSON.stringify({
          error: 'Booking is not available for scheduling',
          status: booking.status,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get availability schedule
    const schedule = await getAvailability();

    // If no specific date requested, return available dates for the next maxAdvanceDays
    if (!date) {
      const availableDates: string[] = [];
      const dateAvailability: Array<{ date: string; available: boolean; reason?: string }> = [];
      const today = new Date();

      // Determine property zone for zone-day restriction checks
      const propertyZipcode = extractZipcode(booking.propertyAddress);
      const propertyZone = getServiceZone(propertyZipcode);

      for (let i = 0; i < schedule.maxAdvanceDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayOfWeek = checkDate.getDay();

        // Check if there's a schedule for this day
        const hasSchedule = schedule.weeklySlots.some(
          s => s.dayOfWeek === dayOfWeek
        );

        if (!hasSchedule) {
          // Don't show non-working days at all
          continue;
        }

        // Check if date is blocked
        const isBlocked = schedule.blockedDates.includes(dateStr);
        if (isBlocked) {
          dateAvailability.push({ date: dateStr, available: false, reason: 'blocked' });
          continue;
        }

        // Zone-day restriction: skip if property zone not allowed on this day
        if (!isZoneAllowedOnDay(propertyZone, dayOfWeek, schedule.zoneDayRestrictions)) {
          dateAvailability.push({ date: dateStr, available: false, reason: 'zone_restricted' });
          continue;
        }

        // Check if there are any available slots (with zone-aware filtering)
        let bookedSlots = await getBookedSlotsForDate(dateStr);
        let existingBookings = await getBookingsForDate(dateStr);

        // When rescheduling, exclude the current booking from conflict checks
        if (isReschedule) {
          bookedSlots = bookedSlots.filter(s => s !== booking.scheduledTime || booking.scheduledDate !== dateStr);
          existingBookings = existingBookings.filter(b => b.id !== booking.id);
        }

        // Daily capacity check: skip if day is at max bookings
        const maxForDay = getDailyCapacity(existingBookings, schedule, dayOfWeek);
        if (existingBookings.length >= maxForDay) {
          dateAvailability.push({ date: dateStr, available: false, reason: 'capacity_full' });
          continue;
        }

        const slots = generateTimeSlots(
          dateStr,
          dayOfWeek,
          schedule,
          bookedSlots,
          schedule.minAdvanceHours,
          booking.propertyAddress,
          existingBookings
        );

        if (slots.some(s => s.available)) {
          availableDates.push(dateStr);
          dateAvailability.push({ date: dateStr, available: true });
        } else {
          dateAvailability.push({ date: dateStr, available: false, reason: 'capacity_full' });
        }
      }

      return new Response(
        JSON.stringify({
          booking: {
            propertyAddress: booking.propertyAddress,
            tenantName: booking.tenantName,
            ...(isReschedule && {
              scheduledDate: booking.scheduledDate,
              scheduledTime: booking.scheduledTime,
              rescheduleCount: booking.rescheduleCount || 0,
            }),
          },
          availableDates,
          dateAvailability,
          minAdvanceHours: schedule.minAdvanceHours,
          maxAdvanceDays: schedule.maxAdvanceDays,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get slots for specific date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // Zone-day restriction check for specific date request
    const specificZipcode = extractZipcode(booking.propertyAddress);
    const specificZone = getServiceZone(specificZipcode);
    if (!isZoneAllowedOnDay(specificZone, dayOfWeek, schedule.zoneDayRestrictions)) {
      return new Response(
        JSON.stringify({
          booking: { propertyAddress: booking.propertyAddress, tenantName: booking.tenantName },
          date,
          slots: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get booked slots for this date and existing bookings for zone filtering
    let bookedSlots = await getBookedSlotsForDate(date);
    let existingBookings = await getBookingsForDate(date);

    // When rescheduling, exclude the current booking from conflict checks
    if (isReschedule) {
      bookedSlots = bookedSlots.filter(s => s !== booking.scheduledTime || booking.scheduledDate !== date);
      existingBookings = existingBookings.filter(b => b.id !== booking.id);
    }

    // Daily capacity check for specific date request
    const maxForDay = getDailyCapacity(existingBookings, schedule, dayOfWeek);
    if (existingBookings.length >= maxForDay) {
      return new Response(
        JSON.stringify({
          booking: { propertyAddress: booking.propertyAddress, tenantName: booking.tenantName },
          date,
          slots: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slots = generateTimeSlots(
      date,
      dayOfWeek,
      schedule,
      bookedSlots,
      schedule.minAdvanceHours,
      booking.propertyAddress,
      existingBookings
    );

    return new Response(
      JSON.stringify({
        booking: {
          propertyAddress: booking.propertyAddress,
          tenantName: booking.tenantName,
        },
        date,
        slots,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get available slots error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
