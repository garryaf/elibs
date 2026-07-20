import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../..",
  },

  // Proxy /api requests to the NestJS backend.
  // - Docker dev: API_URL=http://api:3001 (Docker internal network)
  // - Production (Nginx): rewrites never reached because Nginx handles /api/ first
  // - Local non-Docker dev: falls back to http://localhost:3001
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
