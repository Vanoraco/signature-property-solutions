const apiBaseUrl = process.env.DJANGO_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://127.0.0.1:8000/api'
const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Disable the next/image optimizer for the admin. The admin serves
    // Django-backed media through nginx (already efficient) and an
    // app-administered set of static favicons/logos. Running every
    // thumbnail through /_next/image?url=...&w=96&q=75 instead made the
    // single Node process re-fetch (sometimes its own host) for every
    // image on every navigation, saturating HTTP/2 streams with
    // ERR_HTTP2_PROTOCOL_ERROR and stalling the media grid under fast
    // scrolling. Browsers already cache and lazy-load <img> natively.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'signaturepropertysolutions.com' },
      { protocol: 'https', hostname: 'admin.signaturepropertysolutions.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/images/:path*',
        destination: `${backendOrigin}/images/:path*`,
      },
    ]
  },
};

export default nextConfig;
