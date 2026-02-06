// Send follow-up SMS to tenants who haven't booked within 48 hours
// Called by Vercel Cron daily at 6 PM UTC (1 PM EST)
import type { APIRoute } from 'astro';
import { listBookings, updateBooking } from '../../../lib/db';
import { sendFollowUpReminderSMS } from '../../../lib/twilio';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const bookings = await listBookings(200, 0);

    // Find pending bookings older than 48h that haven't received a follow-up
    const needsFollowUp = bookings.filter(b =>
      b.status === 'pending_tenant' &&
      b.createdAt &&
      new Date(b.createdAt) < fortyEightHoursAgo &&
      !b.smsFollowUpSentAt
    );

    const results: { bookingId: string; tenantName: string; success: boolean; error?: string }[] = [];
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';

    for (const booking of needsFollowUp) {
      const bookingUrl = `${baseUrl}/book/${booking.bookingToken}`;

      const smsResult = await sendFollowUpReminderSMS(
        booking.tenantPhone,
        booking.tenantName,
        booking.propertyAddress,
        bookingUrl
      );

      if (smsResult.success) {
        await updateBooking(booking.id, {
          smsFollowUpSentAt: new Date().toISOString(),
        });
        results.push({ bookingId: booking.id, tenantName: booking.tenantName, success: true });
      } else {
        results.push({
          bookingId: booking.id,
          tenantName: booking.tenantName,
          success: false,
          error: smsResult.error,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEligible: needsFollowUp.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tenant follow-up cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
