import type { NextConfig } from "next";

// Serve the same polished static site in Next.js and Firebase Hosting.
// Keep the React scaffold for future converter development.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        { source: "/create", destination: "/create/index.html" },
        { source: "/legal/:slug", destination: "/legal/:slug.html" },
      ],
    };
  },
};
export default nextConfig;
