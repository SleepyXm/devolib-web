import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  async rewrites() {
    return [
      {
        source: '/:username-dashboard',
        destination: '/dashboard',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        destination: "https://www.devolib.com/:path*",
        permanent: true,
        has: [{ type: "host", value: "devolib.com" }],
      },
    ];
  },
};

export default nextConfig;
