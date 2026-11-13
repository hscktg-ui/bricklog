/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: [
      "@supabase/supabase-js",
      "openai",
      "lucide-react",
      "date-fns",
    ],
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    const longCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    const dayCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, stale-while-revalidate=604800",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: security,
      },
      {
        source: "/brand/:path*",
        headers: dayCache,
      },
      {
        source: "/favicon.svg",
        headers: dayCache,
      },
      {
        source: "/apple-touch-icon.svg",
        headers: dayCache,
      },
      {
        source: "/icon.svg",
        headers: dayCache,
      },
      {
        source: "/og.png",
        headers: dayCache,
      },
      {
        source: "/_next/static/:path*",
        headers: longCache,
      },
    ];
  },
};

export default nextConfig;
