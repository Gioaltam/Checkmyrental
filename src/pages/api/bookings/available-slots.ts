// Get available booking time slots for a specific date
import type { APIRoute } from 'astro';
import { getBookingByToken, getAvailability, getBookedSlotsForDate } from '../../../lib/db';
import type { TimeSlot } from '../../../lib/types';

export const prerender = false;

// Generate time slots for a given day based on availability schedule
function generateTimeSlots(
  date: string,
  dayOfWeek: number,
  schedule: Awaited<ReturnType<typeof getAvailability>>,
  bookedSlots: string[],
  minAdvanceHours: number
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

  // Generate slots
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

    const endTime = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`;

    // Check if slot is within minimum advance time
    const slotDateTime = new Date(`${date}T${startTime}:00`);
    const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithinMinAdvance = hoursUntilSlot >= minAdvanceHours;

    // Check if slot is already booked
    const isBooked = bookedSlots.includes(startTime);

    slots.push({
      date,
      startTime,
      endTime,
      available: isWithinMinAdvance && !isBooked,
    });

    // Move to next slot
    currentMin += slotDuration;
    while (currentMin >= 60) {
      currentMin -= 60;
      currentHour++;
    }
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

    if (booking.status !== 'pending_tenant') {
      return new Response(
        JSON.stringify({
          error: 'Booking already completed',
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
      const today = new Date();

      for (let i = 0; i < schedule.maxAdvanceDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayOfWeek = checkDate.getDay();

        // Check if there's a schedule for this day
        const hasSchedule = schedule.weeklySlots.some(
          s => s.dayOfWeek === dayOfWeek
        );

        // Check if date is blocked
        const isBlocked = schedule.blockedDates.includes(dateStr);

        if (hasSchedule && !isBlocked) {
          // Check if there are any available slots
          const bookedSlots = await getBookedSlotsForDate(dateStr);
          const slots = generateTimeSlots(
            dateStr,
            dayOfWeek,
            schedule,
            bookedSlots,
            schedule.minAdvanceHours
          );

          if (slots.some(s => s.available)) {
            availableDates.push(dateStr);
          }
        }
      }

      return new Response(
        JSON.stringify({
          booking: {
            propertyAddress: booking.propertyAddress,
            tenantName: booking.tenantName,
          },
          availableDates,
          minAdvanceHours: schedule.minAdvanceHours,
          maxAdvanceDays: schedule.maxAdvanceDays,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get slots for specific date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // Get booked slots for this date
    const bookedSlots = await getBookedSlotsForDate(date);

    const slots = generateTimeSlots(
      date,
      dayOfWeek,
      schedule,
      bookedSlots,
      schedule.minAdvanceHours
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
