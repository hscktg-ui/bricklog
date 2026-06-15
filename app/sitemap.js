import { resolvePublicSiteUrl } from "@/lib/brand/seo";
import { getGuideSitemapPaths } from "@/lib/seo/guidePages";

const BASE = resolvePublicSiteUrl();

const STATIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/help", priority: 0.85, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.8, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/refund", priority: 0.4, changeFrequency: "monthly" },
];

export default function sitemap() {
  const lastModified = new Date();
  const guidePaths = getGuideSitemapPaths()
    .filter((p) => p !== "/guides")
    .map((p) => ({
      path: p,
      priority: 0.75,
      changeFrequency: "monthly",
    }));

  const paths = [...STATIC_PATHS, ...guidePaths];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
