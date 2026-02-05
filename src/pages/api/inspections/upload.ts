// Photo upload for inspections
// Stores photos as base64 data URLs in Redis
// To use Vercel Blob storage: install @vercel/blob, set BLOB_READ_WRITE_TOKEN
import type { APIRoute } from 'astro';
import { getInspectionByToken } from '../../../lib/inspection-db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const token = formData.get('token') as string | null;

    if (!file || !token) {
      return new Response(
        JSON.stringify({ error: 'Photo and token are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify access
    const inspection = await getInspectionByToken(token);
    if (!inspection) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Photo must be under 5MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return new Response(
      JSON.stringify({ url: dataUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
