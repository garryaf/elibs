import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../..",
  },

  // Prevent Next.js from redirecting /socket.io/ → /socket.io (stripping slash)
  // which breaks Socket.IO handshake proxy.
  skipTrailingSlashRedirect: true,

  // Proxy /api and /socket.io requests to the NestJS backend.
  // - Docker dev: API_URL=http://api:3001 (Docker internal network)
  // - Production (Nginx): rewrites never reached because Nginx handles /api/ and /socket.io/ first
  // - Local non-Docker dev: falls back to http://localhost:3001
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    return [
      // Socket.IO proxy — enables polling fallback and WebSocket handshake
      {
        source: "/socket.io/",
        destination: `${apiUrl}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiUrl}/socket.io/:path*`,
      },
      // API proxy
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
