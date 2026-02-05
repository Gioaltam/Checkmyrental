// Portal logout - destroy session
import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/portal-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/portal_session=([^;]+)/);
    const sessionId = sessionMatch?.[1];

    if (sessionId) {
      await destroySession(sessionId);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/portal/login',
        'Set-Cookie': 'portal_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      },
    });
  } catch (error) {
    console.error('Portal logout error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/portal/login' },
    });
  }
};
