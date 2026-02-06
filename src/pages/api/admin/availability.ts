// Get or update availability schedule
import type { APIRoute } from 'astro';
import { getAvailability, setAvailability } from '../../../lib/db';
import type { AvailabilitySchedule } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Admin auth check
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const schedule = await getAvailability();

    return new Response(
      JSON.stringify({ schedule }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get availability error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    // Admin auth check
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const schedule = body as AvailabilitySchedule;

    // Validate schedule
    if (!schedule.weeklySlots || !Array.isArray(schedule.weeklySlots)) {
      return new Response(
        JSON.stringify({ error: 'weeklySlots is required and must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate each slot
    for (const slot of schedule.weeklySlots) {
      if (
        typeof slot.dayOfWeek !== 'number' ||
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6
      ) {
        return new Response(
          JSON.stringify({ error: 'Invalid dayOfWeek in weeklySlots (must be 0-6)' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!slot.startTime || !slot.endTime) {
        return new Response(
          JSON.stringify({ error: 'startTime and endTime are required for each slot' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate capacity fields
    if (schedule.maxBookingsPerDay !== undefined) {
      const max = Number(schedule.maxBookingsPerDay);
      if (isNaN(max) || max < 1 || max > 20) {
        return new Response(
          JSON.stringify({ error: 'maxBookingsPerDay must be between 1 and 20' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (schedule.multiUnitMaxBookings !== undefined) {
      const max = Number(schedule.multiUnitMaxBookings);
      if (isNaN(max) || max < 1 || max > 30) {
        return new Response(
          JSON.stringify({ error: 'multiUnitMaxBookings must be between 1 and 30' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (schedule.weekendMaxBookings !== undefined) {
      const max = Number(schedule.weekendMaxBookings);
      if (isNaN(max) || max < 1 || max > 30) {
        return new Response(
          JSON.stringify({ error: 'weekendMaxBookings must be between 1 and 30' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (schedule.zoneDayRestrictions) {
      const validRestrictions = ['TAMPA_ONLY', 'PINELLAS_ONLY', 'ALL'];
      for (const [day, restriction] of Object.entries(schedule.zoneDayRestrictions)) {
        const dayNum = Number(day);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
          return new Response(
            JSON.stringify({ error: 'zoneDayRestrictions keys must be 0-6' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!validRestrictions.includes(restriction as string)) {
          return new Response(
            JSON.stringify({ error: `Invalid zone restriction: ${restriction}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Set defaults if not provided
    const validatedSchedule: AvailabilitySchedule = {
      weeklySlots: schedule.weeklySlots,
      blockedDates: schedule.blockedDates || [],
      slotDuration: schedule.slotDuration || 60,
      minAdvanceHours: schedule.minAdvanceHours || 24,
      maxAdvanceDays: schedule.maxAdvanceDays || 14,
      enableZoneFiltering: schedule.enableZoneFiltering !== false,
      travelBufferMinutes: schedule.travelBufferMinutes || 0,
      maxBookingsPerDay: schedule.maxBookingsPerDay ?? 7,
      multiUnitMaxBookings: schedule.multiUnitMaxBookings ?? 12,
      weekendMaxBookings: schedule.weekendMaxBookings ?? 12,
      zoneDayRestrictions: schedule.zoneDayRestrictions || undefined,
    };

    await setAvailability(validatedSchedule);

    return new Response(
      JSON.stringify({ success: true, schedule: validatedSchedule }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update availability error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
