import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Get backend URL from environment variable or default to localhost
    const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:8000';

    console.log('[Login API] Backend URL:', backendUrl);

    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendUrl}/api/portal/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Login API] Response status:', response.status);

    // Get response text first to debug
    const responseText = await response.text();
    console.log('[Login API] Response text length:', responseText.length);
    console.log('[Login API] Response text:', responseText.substring(0, 200));

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Login API] JSON parse error:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}`);
    }

    // Return the response with the same status code
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Login API error:', error);
    // Log more details about the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error message:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return new Response(
      JSON.stringify({
        detail: 'Internal server error',
        debug: errorMessage  // Include error message in response for debugging
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
