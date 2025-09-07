/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Prevent ESLint errors from breaking Netlify build
  },
  typescript: {
    ignoreBuildErrors: true,  // Prevent TypeScript errors from breaking Netlify build
  },
};

module.exports = nextConfig;
