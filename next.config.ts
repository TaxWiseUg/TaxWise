import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Railway deployment — produces a minimal standalone server
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/?page=pricing",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
