// Get or update a specific booking
import type { APIRoute } from 'astro';
import { getBooking, updateBooking, createNextRecurringBooking, createBooking, releaseSlotLock, removeBookingFromDateIndex } from '../../../lib/db';
import { sendBookingLinkSMS, sendConfirmationSMS, sendReminderSMS, sendNoShowFollowUpSMS } from '../../../lib/twilio';
import { deleteCalendarEvent } from '../../../lib/google-calendar';

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

        // Remove from date index (completed bookings don't block slots)
        if (booking.scheduledDate) {
          await removeBookingFromDateIndex(id, booking.scheduledDate);
        }

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
        // Delete Google Calendar event
        if (booking.googleCalendarEventId) {
          try {
            await deleteCalendarEvent(booking.googleCalendarEventId);
          } catch (calError) {
            console.error('Failed to delete calendar event:', calError);
          }
        }
        // Remove from date index
        if (booking.scheduledDate) {
          await removeBookingFromDateIndex(id, booking.scheduledDate);
        }
        await updateBooking(id, { status: 'cancelled' });
        booking.status = 'cancelled';
        break;

      case 'no_show': {
        await updateBooking(id, { status: 'no_show' });
        booking.status = 'no_show';

        // Remove from date index
        if (booking.scheduledDate) {
          await removeBookingFromDateIndex(id, booking.scheduledDate);
        }
        // Release slot lock
        if (booking.scheduledDate && booking.scheduledTime) {
          await releaseSlotLock(booking.scheduledDate, booking.scheduledTime);
        }
        // Delete Google Calendar event
        if (booking.googleCalendarEventId) {
          try {
            await deleteCalendarEvent(booking.googleCalendarEventId);
          } catch (calError) {
            console.error('Failed to delete calendar event on no-show:', calError);
          }
        }

        // Create new booking so tenant can reschedule
        let noShowNextBooking = null;
        try {
          noShowNextBooking = await createBooking({
            invoiceId: booking.invoiceId,
            propertyIndex: booking.propertyIndex,
            propertyAddress: booking.propertyAddress,
            tenantName: booking.tenantName,
            tenantPhone: booking.tenantPhone,
            landlordName: booking.landlordName,
            landlordEmail: booking.landlordEmail,
            inspectionFrequency: booking.inspectionFrequency,
          });

          // Send no-show follow-up SMS with new booking link
          const noShowBaseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';
          const rescheduleUrl = `${noShowBaseUrl}/book/${noShowNextBooking.bookingToken}`;
          const noShowSms = await sendNoShowFollowUpSMS(
            noShowNextBooking.tenantPhone,
            noShowNextBooking.tenantName,
            noShowNextBooking.propertyAddress,
            rescheduleUrl
          );
          if (noShowSms.success) {
            await updateBooking(noShowNextBooking.id, {
              smsBookingLinkSentAt: new Date().toISOString(),
            });
          }
        } catch (noShowError) {
          console.error('Failed to create no-show follow-up booking:', noShowError);
        }

        // Email landlord about no-show
        const RESEND_KEY = process.env.RESEND_API_KEY;
        if (RESEND_KEY) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'CheckMyRental <send@checkmyrental.io>',
                to: [booking.landlordEmail],
                subject: `No-Show - ${booking.propertyAddress}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Inspection No-Show</h2>
                    <p>Your tenant did not show up for the scheduled inspection.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Property:</strong> ${booking.propertyAddress}</p>
                      <p style="margin: 5px 0;"><strong>Tenant:</strong> ${booking.tenantName}</p>
                      <p style="margin: 5px 0;"><strong>Scheduled:</strong> ${booking.scheduledDate} at ${booking.scheduledTime}</p>
                    </div>
                    <p>We've sent the tenant a new booking link to reschedule. We'll keep you updated once they select a new time.</p>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      Questions? Reply to this email or contact us at (813) 252-0524
                    </p>
                  </div>
                `,
              }),
            });
          } catch (emailError) {
            console.error('Failed to send no-show landlord email:', emailError);
          }

          // Notify admin
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'CheckMyRental <send@checkmyrental.io>',
                to: ['info@checkmyrental.io'],
                subject: `[No-Show] ${booking.propertyAddress} - ${booking.tenantName}`,
                html: `
                  <div style="font-family: Arial, sans-serif;">
                    <h3>Booking No-Show</h3>
                    <p><strong>Property:</strong> ${booking.propertyAddress}</p>
                    <p><strong>Tenant:</strong> ${booking.tenantName} (${booking.tenantPhone})</p>
                    <p><strong>Landlord:</strong> ${booking.landlordName} (${booking.landlordEmail})</p>
                    <p><strong>Was Scheduled:</strong> ${booking.scheduledDate} at ${booking.scheduledTime}</p>
                    <p><strong>New booking created:</strong> ${noShowNextBooking ? 'Yes - SMS sent' : 'No - failed'}</p>
                  </div>
                `,
              }),
            });
          } catch (adminEmailError) {
            console.error('Failed to send no-show admin notification:', adminEmailError);
          }
        }

        // Return early with next booking info
        const updatedNoShow = await getBooking(id);
        return new Response(
          JSON.stringify({
            success: true,
            booking: updatedNoShow,
            ...(noShowNextBooking && { nextBooking: { id: noShowNextBooking.id } }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

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
