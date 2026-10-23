import type { NextConfig } from "next";

// Keep the existing Next.js scaffold; public static pages are the canonical
// no-login Appweld frontend until the actual build service is implemented.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        { source: "/create", destination: "/create/index.html" },
        { source: "/review", destination: "/review/index.html" },
        { source: "/checkout", destination: "/checkout/index.html" },
        { source: "/building", destination: "/building/index.html" },
        { source: "/download", destination: "/download/index.html" },
        { source: "/legal/:slug", destination: "/legal/:slug.html" },
      ],
    };
  },
};
export default nextConfig;
