// Portal data - fetch landlord's invoices and bookings
import type { APIRoute } from 'astro';
import { getSessionEmail } from '../../../lib/portal-auth';
import { listInvoices, listBookings } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Authenticate via session cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/portal_session=([^;]+)/);
    const sessionId = sessionMatch?.[1];

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = await getSessionEmail(sessionId);
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all invoices and filter by landlord email
    const allInvoices = await listInvoices(200, 0);
    const landlordInvoices = allInvoices.filter(
      inv => inv.customerEmail.toLowerCase() === email.toLowerCase()
    );

    // Fetch all bookings and filter by landlord email
    const allBookings = await listBookings(200, 0);
    const landlordBookings = allBookings.filter(
      b => b.landlordEmail.toLowerCase() === email.toLowerCase()
    );

    return new Response(
      JSON.stringify({
        email,
        invoices: landlordInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          createdAt: inv.createdAt,
          properties: inv.properties,
          total: inv.total,
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          paymentMethod: inv.paymentMethod,
          squarePaymentUrl: inv.squarePaymentUrl,
        })),
        bookings: landlordBookings.map(b => ({
          id: b.id,
          propertyAddress: b.propertyAddress,
          tenantName: b.tenantName,
          scheduledDate: b.scheduledDate,
          scheduledTime: b.scheduledTime,
          status: b.status,
          inspectionFrequency: b.inspectionFrequency,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Portal data error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
