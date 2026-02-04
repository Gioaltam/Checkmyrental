// Get or update a specific booking
import type { APIRoute } from 'astro';
import { getBooking, updateBooking, createNextRecurringBooking, releaseSlotLock } from '../../../lib/db';
import { sendBookingLinkSMS, sendConfirmationSMS, sendReminderSMS } from '../../../lib/twilio';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Booking ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking = await getBooking(id);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ booking }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get booking error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Booking ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking = await getBooking(id);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'complete': {
        await updateBooking(id, { status: 'completed' });
        booking.status = 'completed';

        // Auto-create next recurring booking if applicable
        let nextBooking = null;
        try {
          nextBooking = await createNextRecurringBooking(booking);
          if (nextBooking) {
            // Send SMS booking link for next inspection
            const recurBaseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';
            const nextBookingUrl = `${recurBaseUrl}/book/${nextBooking.bookingToken}`;
            const sms = await sendBookingLinkSMS(
              nextBooking.tenantPhone,
              nextBooking.tenantName,
              nextBooking.propertyAddress,
              nextBookingUrl
            );
            if (sms.success) {
              await updateBooking(nextBooking.id, {
                smsBookingLinkSentAt: new Date().toISOString(),
              });
            }
          }
        } catch (recurError) {
          console.error('Failed to create recurring booking:', recurError);
        }

        // Return early with next booking info
        const updatedCompleted = await getBooking(id);
        return new Response(
          JSON.stringify({
            success: true,
            booking: updatedCompleted,
            ...(nextBooking && { nextBooking: { id: nextBooking.id, inspectionFrequency: nextBooking.inspectionFrequency } }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel':
        if (booking.scheduledDate && booking.scheduledTime) {
          await releaseSlotLock(booking.scheduledDate, booking.scheduledTime);
        }
        await updateBooking(id, { status: 'cancelled' });
        booking.status = 'cancelled';
        break;

      case 'no_show':
        await updateBooking(id, { status: 'no_show' });
        booking.status = 'no_show';
        break;

      case 'resend_link':
        // Resend the booking link SMS
        if (booking.status !== 'pending_tenant') {
          return new Response(
            JSON.stringify({ error: 'Can only resend link for pending bookings' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';
        const bookingUrl = `${baseUrl}/book/${booking.bookingToken}`;

        const smsResult = await sendBookingLinkSMS(
          booking.tenantPhone,
          booking.tenantName,
          booking.propertyAddress,
          bookingUrl
        );

        if (!smsResult.success) {
          return new Response(
            JSON.stringify({ error: 'Failed to send SMS', details: smsResult.error }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await updateBooking(id, {
          smsBookingLinkSentAt: new Date().toISOString(),
        });
        break;

      case 'retry_confirmation_sms': {
        if (booking.status !== 'scheduled') {
          return new Response(
            JSON.stringify({ error: 'Can only retry confirmation SMS for scheduled bookings' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!booking.scheduledDate || !booking.scheduledTime) {
          return new Response(
            JSON.stringify({ error: 'Booking has no scheduled date/time' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const confDate = new Date(booking.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const [ch, cm] = booking.scheduledTime.split(':').map(Number);
        const confTime = `${ch % 12 || 12}:${String(cm).padStart(2, '0')} ${ch >= 12 ? 'PM' : 'AM'}`;

        const confSms = await sendConfirmationSMS(
          booking.tenantPhone, booking.tenantName, booking.propertyAddress, confDate, confTime
        );

        if (!confSms.success) {
          return new Response(
            JSON.stringify({ error: 'Failed to send SMS', details: confSms.error }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await updateBooking(id, { smsConfirmationSentAt: new Date().toISOString() });
        break;
      }

      case 'retry_reminder_sms': {
        if (booking.status !== 'scheduled') {
          return new Response(
            JSON.stringify({ error: 'Can only send reminders for scheduled bookings' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!booking.scheduledTime) {
          return new Response(
            JSON.stringify({ error: 'Booking has no scheduled time' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const [rh, rm] = booking.scheduledTime.split(':').map(Number);
        const reminderTime = `${rh % 12 || 12}:${String(rm).padStart(2, '0')} ${rh >= 12 ? 'PM' : 'AM'}`;

        const reminderResult = await sendReminderSMS(
          booking.tenantPhone, booking.propertyAddress, reminderTime
        );

        if (!reminderResult.success) {
          return new Response(
            JSON.stringify({ error: 'Failed to send reminder SMS', details: reminderResult.error }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await updateBooking(id, { smsReminderSentAt: new Date().toISOString() });
        break;
      }

      case 'update_notes': {
        const notes = body.notes ?? '';
        await updateBooking(id, { notes });
        break;
      }

      case 'release_lock': {
        const { lockDate, lockTime } = body;
        if (!lockDate || !lockTime) {
          return new Response(
            JSON.stringify({ error: 'lockDate and lockTime required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        await releaseSlotLock(lockDate, lockTime);
        return new Response(
          JSON.stringify({ success: true, message: 'Lock released' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Fetch updated booking
    const updatedBooking = await getBooking(id);

    return new Response(
      JSON.stringify({ success: true, booking: updatedBooking }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update booking error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
