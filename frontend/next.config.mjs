/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig = {
  output: "standalone",
  async rewrites() {
    // Proxy API calls to Django so the browser talks to a single origin (no CORS needed).
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*/` }];
  },
};

export default nextConfig;
