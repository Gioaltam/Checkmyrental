// Portal login - send magic link email
import type { APIRoute } from 'astro';
import { createMagicLink, sendMagicLinkEmail } from '../../../lib/portal-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return success even if email not found (prevent email enumeration)
    const token = await createMagicLink(normalizedEmail);
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';
    const magicLinkUrl = `${baseUrl}/api/portal/verify?token=${token}`;

    await sendMagicLinkEmail(normalizedEmail, magicLinkUrl);

    return new Response(
      JSON.stringify({ success: true, message: 'If an account exists for that email, a login link has been sent.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Portal login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
