/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Rewrites removed - using API routes for proxying instead
  // See /app/api/v1/[...proxy]/route.ts
}

module.exports = nextConfig