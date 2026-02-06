// Auto-cancel pending_tenant bookings that are older than 7 days
// Called by Vercel Cron daily at 2 PM UTC (9 AM EST)
import type { APIRoute } from 'astro';
import { listBookings, updateBooking } from '../../../lib/db';

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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const bookings = await listBookings(200, 0);

    // Find stale pending bookings (created > 7 days ago, still pending_tenant)
    const staleBookings = bookings.filter(b =>
      b.status === 'pending_tenant' &&
      b.createdAt &&
      new Date(b.createdAt) < sevenDaysAgo
    );

    const results: { bookingId: string; tenantName: string; success: boolean; error?: string }[] = [];
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    for (const booking of staleBookings) {
      try {
        await updateBooking(booking.id, { status: 'cancelled' });

        // Email landlord
        if (RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'CheckMyRental <send@checkmyrental.io>',
              to: [booking.landlordEmail],
              subject: `Booking Expired - ${booking.propertyAddress}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #e67e22;">Booking Expired</h2>
                  <p>The tenant did not respond to the inspection booking request within 7 days, so it has been automatically cancelled.</p>
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Property:</strong> ${booking.propertyAddress}</p>
                    <p style="margin: 5px 0;"><strong>Tenant:</strong> ${booking.tenantName}</p>
                  </div>
                  <p>If you'd like to try again, please contact us and we'll send a new booking link.</p>
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Questions? Reply to this email or contact us at (813) 252-0524
                  </p>
                </div>
              `,
            }),
          });

          // Notify admin
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'CheckMyRental <send@checkmyrental.io>',
              to: ['info@checkmyrental.io'],
              subject: `[Expired] ${booking.propertyAddress} - ${booking.tenantName}`,
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h3>Stale Booking Auto-Cancelled</h3>
                  <p><strong>Property:</strong> ${booking.propertyAddress}</p>
                  <p><strong>Tenant:</strong> ${booking.tenantName} (${booking.tenantPhone})</p>
                  <p><strong>Landlord:</strong> ${booking.landlordName} (${booking.landlordEmail})</p>
                  <p><strong>Created:</strong> ${booking.createdAt}</p>
                  <p>Tenant did not respond within 7 days.</p>
                </div>
              `,
            }),
          });
        }

        results.push({ bookingId: booking.id, tenantName: booking.tenantName, success: true });
      } catch (err) {
        results.push({
          bookingId: booking.id,
          tenantName: booking.tenantName,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalStale: staleBookings.length,
        cancelled: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stale bookings cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
