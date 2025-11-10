import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Get backend URL from environment variable or default to localhost
    const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Map frontend fields to backend expected format
    const backendPayload = {
      email: body.email,
      password: body.password,
      full_name: body.full_name || '',
    };

    // Forward the request to the FastAPI backend register endpoint
    const response = await fetch(`${backendUrl}/api/portal/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    });

    const data = await response.json();

    // Return the response with the same status code
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Register API error:', error);
    return new Response(
      JSON.stringify({ detail: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
