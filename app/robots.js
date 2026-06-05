import { resolvePublicSiteUrl } from "@/lib/brand/seo";

export default function robots() {
  const base = resolvePublicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/billing/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https:\/\//, ""),
  };
}
