// Confirm a booking - tenant selects a time slot
import type { APIRoute } from 'astro';
import { getBookingByToken, updateBooking, getBookedSlotsForDate } from '../../../lib/db';
import { sendConfirmationSMS } from '../../../lib/twilio';

export const prerender = false;

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format time for display
function formatTime(timeStr: string): string {
  const [hour, minute] = timeStr.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, date, time } = body;

    if (!token || !date || !time) {
      return new Response(
        JSON.stringify({ error: 'Token, date, and time are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get booking by token
    const booking = await getBookingByToken(token);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Invalid booking token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check booking is still pending
    if (booking.status !== 'pending_tenant') {
      return new Response(
        JSON.stringify({
          error: 'Booking is no longer available',
          status: booking.status,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify slot is still available (prevent race conditions)
    const bookedSlots = await getBookedSlotsForDate(date);
    if (bookedSlots.includes(time)) {
      return new Response(
        JSON.stringify({ error: 'This time slot has already been booked. Please select another time.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update booking with scheduled date/time
    await updateBooking(booking.id, {
      scheduledDate: date,
      scheduledTime: time,
      status: 'scheduled',
    });

    // Send confirmation SMS to tenant
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    const smsResult = await sendConfirmationSMS(
      booking.tenantPhone,
      booking.tenantName,
      booking.propertyAddress,
      formattedDate,
      formattedTime
    );

    if (smsResult.success) {
      await updateBooking(booking.id, {
        smsConfirmationSentAt: new Date().toISOString(),
      });
    }

    // Send email notification to landlord
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: [booking.landlordEmail],
            subject: `Inspection Scheduled - ${booking.propertyAddress}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e74c3c;">Inspection Scheduled</h2>
                <p>Good news! Your tenant has scheduled their property inspection.</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Property:</strong> ${booking.propertyAddress}</p>
                  <p style="margin: 5px 0;"><strong>Tenant:</strong> ${booking.tenantName}</p>
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                </div>

                <p>A CheckMyRental inspector will conduct the inspection and you'll receive a detailed report within 24 hours.</p>

                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Questions? Reply to this email or contact us at (813) 252-0524
                </p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send landlord notification:', emailError);
        // Don't fail the booking if email fails
      }

      // Also notify admin
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: ['info@checkmyrental.io'],
            subject: `[Booking] ${formattedDate} ${formattedTime} - ${booking.propertyAddress}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h3>New Booking Confirmed</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Property:</strong> ${booking.propertyAddress}</p>
                <p><strong>Tenant:</strong> ${booking.tenantName} (${booking.tenantPhone})</p>
                <p><strong>Landlord:</strong> ${booking.landlordName} (${booking.landlordEmail})</p>
              </div>
            `,
          }),
        });
      } catch (adminEmailError) {
        console.error('Failed to send admin notification:', adminEmailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking confirmed!',
        booking: {
          propertyAddress: booking.propertyAddress,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Confirm booking error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
