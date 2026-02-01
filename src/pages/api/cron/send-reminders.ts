// Send 24-hour reminder SMS for tomorrow's bookings
// Called by Vercel Cron daily at 10 PM UTC (5 PM EST)
import type { APIRoute } from 'astro';
import { listBookings, updateBooking } from '../../../lib/db';
import { sendReminderSMS } from '../../../lib/twilio';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret (Vercel sets CRON_SECRET automatically for cron jobs)
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Calculate tomorrow's date in EST (Florida timezone)
    const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const tomorrow = new Date(estNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get all bookings
    const bookings = await listBookings(200, 0);

    // Filter: scheduled for tomorrow, reminder not yet sent
    const needsReminder = bookings.filter(b =>
      b.status === 'scheduled' &&
      b.scheduledDate === tomorrowStr &&
      !b.smsReminderSentAt &&
      b.scheduledTime
    );

    const results: { bookingId: string; tenantName: string; success: boolean; error?: string }[] = [];

    for (const booking of needsReminder) {
      const [hour, minute] = booking.scheduledTime!.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const formattedTime = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;

      const smsResult = await sendReminderSMS(
        booking.tenantPhone,
        booking.propertyAddress,
        formattedTime
      );

      if (smsResult.success) {
        await updateBooking(booking.id, {
          smsReminderSentAt: new Date().toISOString(),
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

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        date: tomorrowStr,
        totalEligible: needsReminder.length,
        sent,
        failed,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send reminders cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
