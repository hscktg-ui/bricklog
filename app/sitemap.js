import { resolvePublicSiteUrl } from "@/lib/brand/seo";

const BASE = resolvePublicSiteUrl();

export default function sitemap() {
  const lastModified = new Date();
  const paths = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/terms", priority: 0.4, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/refund", priority: 0.4, changeFrequency: "monthly" },
  ];
  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
