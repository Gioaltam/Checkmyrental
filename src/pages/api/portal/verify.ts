// Portal verify - validate magic link token and create session
import type { APIRoute } from 'astro';
import { verifyMagicLink, createSession } from '../../../lib/portal-auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/portal/login?error=missing_token' },
      });
    }

    const email = await verifyMagicLink(token);

    if (!email) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/portal/login?error=invalid_token' },
      });
    }

    // Create session
    const sessionId = await createSession(email);

    // Set session cookie and redirect to portal dashboard
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/portal',
        'Set-Cookie': `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
      },
    });
  } catch (error) {
    console.error('Portal verify error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/portal/login?error=server_error' },
    });
  }
};
