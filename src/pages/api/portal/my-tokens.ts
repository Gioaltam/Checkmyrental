import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get the Authorization header from the request
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ detail: 'Authorization header missing' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get backend URL from environment variable or default to localhost
    const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendUrl}/api/portal/my-tokens`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
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
    console.error('My-tokens API error:', error);
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
