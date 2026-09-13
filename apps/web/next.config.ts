import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  reactCompiler: true,
  async rewrites() {
    // The hosted deployment keeps the NestJS target server-only.  The public
    // client always calls same-origin /api; localhost remains a development
    // convenience only.
    const configuredTarget = process.env.AURUM_API_INTERNAL_URL?.trim();
    if (process.env.AURUM_MOBILE_MODE === "release" && !configuredTarget) {
      throw new Error("AURUM_API_INTERNAL_URL is required for Release/private-beta builds");
    }
    const apiTarget = configuredTarget ??
      (process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
        : "http://localhost:3001");
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
