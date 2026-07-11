const apiBaseUrl = process.env.DJANGO_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://127.0.0.1:8000/api'
const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'signaturepropertysolutions.com' },
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
