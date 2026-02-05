// Get or update an inspection
import type { APIRoute } from 'astro';
import { getInspection, getInspectionByToken, updateInspection } from '../../../lib/inspection-db';

export const prerender = false;

// GET - retrieve inspection (by ID for admin, or by token for inspector)
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try by token first (for inspector access), then by ID (for admin access)
    let inspection = await getInspectionByToken(id);
    if (!inspection) {
      // Admin access - check auth
      const authHeader = request.headers.get('Authorization');
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      inspection = await getInspection(id);
    }

    if (!inspection) {
      return new Response(
        JSON.stringify({ error: 'Inspection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ inspection }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get inspection error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PATCH - update inspection data (auto-save from mobile)
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Token-based access for inspector
    let inspection = await getInspectionByToken(id);
    if (!inspection) {
      // Admin fallback
      const authHeader = request.headers.get('Authorization');
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      inspection = await getInspection(id);
    }

    if (!inspection) {
      return new Response(
        JSON.stringify({ error: 'Inspection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (inspection.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Inspection already completed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.rooms) updates.rooms = body.rooms;
    if (body.overallNotes !== undefined) updates.overallNotes = body.overallNotes;
    if (body.status === 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }

    await updateInspection(inspection.id, updates as any);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update inspection error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
