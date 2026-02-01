// Update inquiry status (archive, etc.)
import type { APIRoute } from 'astro';
import { getInquiry, updateInquiryStatus } from '../../../lib/db';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
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
        JSON.stringify({ error: 'Inquiry ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inquiry = await getInquiry(id);
    if (!inquiry) {
      return new Response(
        JSON.stringify({ error: 'Inquiry not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['new', 'invoiced', 'archived'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be: new, invoiced, or archived' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updateInquiryStatus(id, status);

    return new Response(
      JSON.stringify({ success: true, inquiry: { ...inquiry, status } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update inquiry error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
