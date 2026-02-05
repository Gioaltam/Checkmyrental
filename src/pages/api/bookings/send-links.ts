// Send booking links via SMS to tenants after invoice is paid
import type { APIRoute } from 'astro';
import { getInvoice, createBooking, updateBooking, getBookingsByInvoice } from '../../../lib/db';
import { sendBookingLinkSMS } from '../../../lib/twilio';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
    const { invoiceId } = body;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get base URL for booking links
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';

    const results: {
      propertyIndex: number;
      address: string;
      tenantName: string;
      success: boolean;
      bookingId?: string;
      error?: string;
    }[] = [];

    // Check for existing bookings to prevent duplicates
    const existingBookings = await getBookingsByInvoice(invoiceId);

    // Create bookings and send SMS for each property with tenant info
    for (let i = 0; i < invoice.properties.length; i++) {
      const property = invoice.properties[i];

      // Skip if no tenant phone number
      if (!property.tenantPhone) {
        results.push({
          propertyIndex: i,
          address: property.address,
          tenantName: property.tenantName || 'N/A',
          success: false,
          error: 'No tenant phone number provided',
        });
        continue;
      }

      // Skip if booking already exists for this property
      const existingBooking = existingBookings.find(b => b.propertyIndex === i);
      if (existingBooking) {
        results.push({
          propertyIndex: i,
          address: property.address,
          tenantName: property.tenantName || 'Tenant',
          success: false,
          error: 'Booking already exists for this property',
          bookingId: existingBooking.id,
        });
        continue;
      }

      try {
        // Create booking record
        const booking = await createBooking({
          invoiceId,
          propertyIndex: i,
          propertyAddress: property.address,
          tenantName: property.tenantName || 'Tenant',
          tenantPhone: property.tenantPhone,
          landlordName: invoice.customerName,
          landlordEmail: invoice.customerEmail,
          inspectionFrequency: invoice.inspectionFrequency,
        });

        // Build booking URL
        const bookingUrl = `${baseUrl}/book/${booking.bookingToken}`;

        // Send SMS
        const smsResult = await sendBookingLinkSMS(
          property.tenantPhone,
          property.tenantName || 'Tenant',
          property.address,
          bookingUrl
        );

        if (smsResult.success) {
          await updateBooking(booking.id, {
            smsBookingLinkSentAt: new Date().toISOString(),
          });

          results.push({
            propertyIndex: i,
            address: property.address,
            tenantName: property.tenantName || 'Tenant',
            success: true,
            bookingId: booking.id,
          });
        } else {
          results.push({
            propertyIndex: i,
            address: property.address,
            tenantName: property.tenantName || 'Tenant',
            success: false,
            bookingId: booking.id,
            error: smsResult.error || 'Failed to send SMS',
          });
        }
      } catch (error) {
        results.push({
          propertyIndex: i,
          address: property.address,
          tenantName: property.tenantName || 'Tenant',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} booking link(s). ${failCount} failed.`,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send booking links error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
