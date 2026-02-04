// List bookings for admin dashboard
import type { APIRoute } from 'astro';
import { listBookings, getBookingStats, getAvailability, listSlotLocks } from '../../../lib/db';
import type { Booking } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
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

    // Parse query params
    const status = url.searchParams.get('status') as Booking['status'] | null;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Get bookings
    const bookings = await listBookings(limit, offset, status || undefined);

    // Get stats and schedule settings
    const stats = await getBookingStats();
    const schedule = await getAvailability();

    // Get slot locks if requested
    const includeLocks = url.searchParams.get('includeLocks') === 'true';
    const locks = includeLocks ? await listSlotLocks() : undefined;

    return new Response(
      JSON.stringify({
        bookings,
        stats,
        slotDuration: schedule.slotDuration || 60,
        locks,
        pagination: {
          limit,
          offset,
          total: bookings.length,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('List bookings error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
