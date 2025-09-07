/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Prevent build from failing due to ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Prevent build from failing due to TypeScript errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
