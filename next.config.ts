import type { NextConfig } from "next";

// The static landing and builder remain canonical; optionally proxy the live
// URL-inspection API to Cloud Run after APPWELD_API_ORIGIN has been configured.
const backend = process.env.APPWELD_API_ORIGIN?.replace(/\/$/, "");
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        ...(backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : []),
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
