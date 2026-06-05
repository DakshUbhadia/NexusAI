import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ['@liveblocks/node'],
  transpilePackages: ['gsap'],   // ← ADD this line
  images: {
    remotePatterns: [
      // ...your existing patterns...
      { protocol: 'https', hostname: '**.unsplash.com' },  // ← ADD if needed
    ],
  },
};

export default nextConfig;
