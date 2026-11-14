import type { NextConfig } from "next";

// Security headers mirrored from evergreendigitalco.com's vercel.json.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Clickjacking, base-tag and form-hijack protection that does not restrict scripts or styles, so nothing in the app can break.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@grove/core", "@grove/db", "@grove/brand"],
  // CSV import (2 MB) and file uploads (4 MB) go through server actions (default limit is 1 MB).
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
