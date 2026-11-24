import type { NextConfig } from 'next';

const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }] },
  turbopack: {
    root: process.cwd(),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      // Toda la web: no se puede meter en un iframe ajeno (clickjacking)...
      { source: '/((?!embed/).*)', headers: [...security, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] },
      // ...salvo el reproductor, que está pensado para incrustarse en cualquier web.
      { source: '/embed/:path*', headers: [...security, { key: 'Content-Security-Policy', value: 'frame-ancestors *' }] },
    ];
  },
};

export default nextConfig;
