import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams
  
  // API routes don't need middleware processing
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }
  
  // Check for token in URL (coming from landing page)
  const token = searchParams.get('token')
  if (token) {
    // Create response that continues to the page
    const response = NextResponse.next()
    // Set the token as a cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    return response
  }
  
  // Check for session cookie
  const sessionToken = request.cookies.get('token')
  
  // If no session and no token in URL, redirect to landing page
  // DISABLED FOR DEVELOPMENT - Allow access without authentication
  // if (!sessionToken && !token) {
  //   return NextResponse.redirect('http://localhost:5000/static/landing.html')
  // }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}