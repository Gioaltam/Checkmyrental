/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'storage.googleapis.com', 'images.unsplash.com'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:8000/:path*'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Allow iframe embedding in development for demo/landing page
          // In production, this should be set to DENY or SAMEORIGIN
          {
            key: 'X-Frame-Options',
            value: process.env.NODE_ENV === 'development' ? 'ALLOWALL' : 'DENY'
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "frame-ancestors 'self' http://localhost:4321 http://localhost:3000"
              : "frame-ancestors 'none'"
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig