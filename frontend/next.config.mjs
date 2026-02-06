/** @type {import('next').NextConfig} */
const distDir = process.env.NEXT_DIST_DIR?.trim();
const nextConfig = {
  reactStrictMode: true,
  // Workaround: allow e2e/CI runs to use a different dist directory to avoid local .next write/ACL issues on Windows.
  ...(distDir ? { distDir } : {}),
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
      { source: "/storage/:path*", destination: "http://127.0.0.1:8000/storage/:path*" },
    ];
  },
};

export default nextConfig;
