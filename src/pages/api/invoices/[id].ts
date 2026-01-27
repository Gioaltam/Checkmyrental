import type { APIRoute } from 'astro';
import { getInvoice, updateInvoice } from '../../../lib/db';
import { getSquareInvoiceStatus, cancelSquareInvoice } from '../../../lib/square';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    // Simple auth check
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
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If Square invoice, sync status
    if (invoice.squareInvoiceId && invoice.status !== 'paid' && invoice.status !== 'cancelled') {
      try {
        const squareStatus = await getSquareInvoiceStatus(invoice.squareInvoiceId);

        let newStatus = invoice.status;
        if (squareStatus.status === 'PAID') {
          newStatus = 'paid';
          await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() });
          invoice.status = 'paid';
          invoice.paidAt = new Date().toISOString();
        } else if (squareStatus.status === 'CANCELED') {
          newStatus = 'cancelled';
          await updateInvoice(id, { status: 'cancelled' });
          invoice.status = 'cancelled';
        }
      } catch (squareError) {
        console.error('Error syncing Square status:', squareError);
        // Continue with cached status
      }
    }

    return new Response(
      JSON.stringify({ invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get invoice error:', error);
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
    // Simple auth check
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
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { action, status } = body;

    // Handle specific actions
    if (action === 'mark_paid') {
      await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() });
      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
    } else if (action === 'cancel') {
      // If Square invoice, cancel in Square too
      if (invoice.squareInvoiceId) {
        try {
          await cancelSquareInvoice(invoice.squareInvoiceId);
        } catch (squareError) {
          console.error('Error canceling Square invoice:', squareError);
          // Continue anyway
        }
      }
      await updateInvoice(id, { status: 'cancelled' });
      invoice.status = 'cancelled';
    } else if (status) {
      // Direct status update
      await updateInvoice(id, { status });
      invoice.status = status;
    }

    return new Response(
      JSON.stringify({ success: true, invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update invoice error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
