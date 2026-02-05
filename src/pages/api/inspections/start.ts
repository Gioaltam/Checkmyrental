// Start an inspection for a booking
import type { APIRoute } from 'astro';
import { getBooking, updateBooking } from '../../../lib/db';
import { getInspectionByBooking, createInspection } from '../../../lib/inspection-db';
import { getInvoice } from '../../../lib/db';
import { ROOM_TEMPLATES } from '../../../lib/types';
import type { Property } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { bookingId, inspectorName } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'bookingId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if inspection already exists for this booking
    const existing = await getInspectionByBooking(bookingId);
    if (existing) {
      return new Response(
        JSON.stringify({ inspection: existing }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking = await getBooking(bookingId);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get property type from invoice for room templates
    let propertyType: Property['type'] = 'apartment';
    try {
      const invoice = await getInvoice(booking.invoiceId);
      if (invoice && invoice.properties[booking.propertyIndex]) {
        propertyType = invoice.properties[booking.propertyIndex].type;
      }
    } catch {
      // Default to apartment if we can't determine type
    }

    const rooms = ROOM_TEMPLATES[propertyType].map(room => ({
      name: room.name,
      items: room.items.map(item => ({ name: item.name })),
    }));

    const inspection = await createInspection({
      bookingId,
      inspectorName: inspectorName || 'CheckMyRental Inspector',
      propertyAddress: booking.propertyAddress,
      tenantName: booking.tenantName,
      landlordName: booking.landlordName,
      landlordEmail: booking.landlordEmail,
      rooms,
    });

    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';
    const inspectionUrl = `${baseUrl}/inspect/${inspection.inspectionToken}`;

    return new Response(
      JSON.stringify({ inspection, inspectionUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Start inspection error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
