/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: ".",
  },
  // Netlify optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
