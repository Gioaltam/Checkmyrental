import type { APIRoute } from 'astro';
import { listInvoices, listInquiries, getStats } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
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

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all'; // 'invoices', 'inquiries', 'stats', 'all'
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result: Record<string, unknown> = {};

    if (type === 'invoices' || type === 'all') {
      result.invoices = await listInvoices(limit, offset);
    }

    if (type === 'inquiries' || type === 'all') {
      result.inquiries = await listInquiries(limit, offset);
    }

    if (type === 'stats' || type === 'all') {
      result.stats = await getStats();
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('List error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
