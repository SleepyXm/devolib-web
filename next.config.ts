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
};

export default nextConfig;
