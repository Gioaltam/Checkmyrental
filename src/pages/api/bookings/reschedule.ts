// Reschedule a booking - tenant changes their scheduled time
import type { APIRoute } from 'astro';
import { getBookingByToken, updateBooking, getBookedSlotsForDate } from '../../../lib/db';
import { sendRescheduleSMS } from '../../../lib/twilio';
import { extractZipcode, getServiceZone, getZoneName } from '../../../lib/zones';

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

    // Must be in 'scheduled' status to reschedule
    if (booking.status !== 'scheduled') {
      return new Response(
        JSON.stringify({
          error: 'Only scheduled bookings can be rescheduled',
          status: booking.status,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enforce reschedule limit (max 2)
    const rescheduleCount = Number(booking.rescheduleCount) || 0;
    if (rescheduleCount >= 2) {
      return new Response(
        JSON.stringify({ error: 'Maximum reschedule limit reached (2). Please contact us to make changes.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // FL law: current booking must be 24+ hours away to allow reschedule
    const now = new Date();
    if (booking.scheduledDate && booking.scheduledTime) {
      const currentSlotDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}:00`);
      const hoursUntilCurrent = (currentSlotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilCurrent < 24) {
        return new Response(
          JSON.stringify({ error: 'Cannot reschedule within 24 hours of the current appointment (FL law requirement).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // FL law: new time must be 24+ hours out
    const newSlotDate = new Date(`${date}T${time}:00`);
    const hoursUntilNew = (newSlotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilNew < 24) {
      return new Response(
        JSON.stringify({ error: 'New appointment must be at least 24 hours from now (FL law requirement).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify new slot is still available (exclude this booking's current slot)
    const bookedSlots = await getBookedSlotsForDate(date);
    const isSlotTaken = booking.scheduledDate === date
      ? bookedSlots.filter(s => s !== booking.scheduledTime).includes(time)
      : bookedSlots.includes(time);

    if (isSlotTaken) {
      return new Response(
        JSON.stringify({ error: 'This time slot has already been booked. Please select another time.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract zone information
    const zipcode = extractZipcode(booking.propertyAddress);
    const serviceZone = getServiceZone(zipcode);

    // Update booking
    await updateBooking(booking.id, {
      scheduledDate: date,
      scheduledTime: time,
      zipcode: zipcode || undefined,
      serviceZone: serviceZone,
      rescheduleCount: rescheduleCount + 1,
    });

    // Send reschedule SMS to tenant
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    await sendRescheduleSMS(
      booking.tenantPhone,
      booking.tenantName,
      booking.propertyAddress,
      formattedDate,
      formattedTime
    );

    // Email landlord about reschedule
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
            subject: `Inspection Rescheduled - ${booking.propertyAddress}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e67e22;">Inspection Rescheduled</h2>
                <p>Your tenant has rescheduled their property inspection.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Property:</strong> ${booking.propertyAddress}</p>
                  <p style="margin: 5px 0;"><strong>Tenant:</strong> ${booking.tenantName}</p>
                  <p style="margin: 5px 0;"><strong>New Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0;"><strong>New Time:</strong> ${formattedTime}</p>
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
        console.error('Failed to send landlord reschedule notification:', emailError);
      }

      // Notify admin
      const zoneName = getZoneName(serviceZone);
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
            subject: `[Rescheduled] ${formattedDate} ${formattedTime} - ${zoneName} - ${booking.propertyAddress}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h3>Booking Rescheduled</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Zone:</strong> ${zoneName} (${serviceZone})</p>
                <p><strong>Property:</strong> ${booking.propertyAddress}</p>
                <p><strong>Tenant:</strong> ${booking.tenantName} (${booking.tenantPhone})</p>
                <p><strong>Landlord:</strong> ${booking.landlordName} (${booking.landlordEmail})</p>
                <p><strong>Reschedule #:</strong> ${rescheduleCount + 1} of 2</p>
              </div>
            `,
          }),
        });
      } catch (adminEmailError) {
        console.error('Failed to send admin reschedule notification:', adminEmailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking rescheduled!',
        booking: {
          propertyAddress: booking.propertyAddress,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          rescheduleCount: rescheduleCount + 1,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reschedule booking error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
