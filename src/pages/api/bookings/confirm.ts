// Confirm a booking - tenant selects a time slot
import type { APIRoute } from 'astro';
import { getBookingByToken, updateBooking, getBookedSlotsForDate, acquireSlotLock, releaseSlotLock, getAvailability, getBookingsForDate, addBookingToDateIndex } from '../../../lib/db';
import { sendConfirmationSMS } from '../../../lib/twilio';
import { extractZipcode, getServiceZone, getZoneName, isZoneAllowedOnDay } from '../../../lib/zones';
import { createCalendarEvent } from '../../../lib/google-calendar';
import { getDailyCapacity } from '../../../lib/scheduling';

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

    // Atomic slot lock — prevents double-booking
    const lockAcquired = await acquireSlotLock(date, time, booking.id);
    if (!lockAcquired) {
      return new Response(
        JSON.stringify({ error: 'This time slot was just booked by someone else. Please select another time.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Zone-day restriction enforcement
    const availability = await getAvailability();
    const zipcode = extractZipcode(booking.propertyAddress);
    const serviceZone = getServiceZone(zipcode);
    const confirmDayOfWeek = new Date(`${date}T12:00:00`).getDay();

    if (!isZoneAllowedOnDay(serviceZone, confirmDayOfWeek, availability.zoneDayRestrictions)) {
      await releaseSlotLock(date, time);
      return new Response(
        JSON.stringify({ error: 'This date is not available for your area. Please select another date.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Daily capacity enforcement
    const existingBookingsForDay = await getBookingsForDate(date);
    const maxForDay = getDailyCapacity(existingBookingsForDay, availability, confirmDayOfWeek);
    if (existingBookingsForDay.length >= maxForDay) {
      await releaseSlotLock(date, time);
      return new Response(
        JSON.stringify({ error: 'This date is fully booked. Please select another date.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Secondary check for existing bookings
    const bookedSlots = await getBookedSlotsForDate(date);
    if (bookedSlots.includes(time)) {
      await releaseSlotLock(date, time);
      return new Response(
        JSON.stringify({ error: 'This time slot has already been booked. Please select another time.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update booking with scheduled date/time and zone info (zipcode and serviceZone already extracted above)
    try {
      await updateBooking(booking.id, {
        scheduledDate: date,
        scheduledTime: time,
        status: 'scheduled',
        zipcode: zipcode || undefined,
        serviceZone: serviceZone,
      });
      // Add to date index for fast lookups
      await addBookingToDateIndex(booking.id, date);
    } catch (updateError) {
      await releaseSlotLock(date, time);
      throw updateError;
    }

    // Create Google Calendar event (availability already fetched above)
    try {
      const calendarEventId = await createCalendarEvent({
        date,
        time,
        durationMinutes: availability.slotDuration || 60,
        propertyAddress: booking.propertyAddress,
        tenantName: booking.tenantName,
        tenantPhone: booking.tenantPhone,
        landlordName: booking.landlordName,
        landlordEmail: booking.landlordEmail,
        bookingId: booking.id,
      });
      if (calendarEventId) {
        await updateBooking(booking.id, { googleCalendarEventId: calendarEventId });
      }
    } catch (calError) {
      console.error('Failed to create calendar event:', calError);
    }

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

    // Notify admin of confirmed booking (landlord receives a single payment receipt
    // when invoice is marked paid, so no per-booking email to avoid spam)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
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
            subject: `[Booking] ${formattedDate} ${formattedTime} - ${zoneName} - ${booking.propertyAddress}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h3>New Booking Confirmed</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Zone:</strong> ${zoneName} (${serviceZone})</p>
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
