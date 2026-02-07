/** @type {import('next').NextConfig} */
const distDir = process.env.NEXT_DIST_DIR?.trim();
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000")
  .trim()
  .replace(/\/$/, "");
const nextConfig = {
  reactStrictMode: true,
  // Workaround: allow e2e/CI runs to use a different dist directory to avoid local .next write/ACL issues on Windows.
  ...(distDir ? { distDir } : {}),
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/storage/:path*", destination: `${apiBase}/storage/:path*` },
    ];
  },
};

export default nextConfig;
