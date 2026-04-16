import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  // Netlify optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
