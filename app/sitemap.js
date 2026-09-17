import { resolvePublicSiteUrl } from "@/lib/brand/seo";
import { getGuideSitemapPaths } from "@/lib/seo/guidePages";
import { getTrendCatalog } from "@/lib/trends/catalog";
import { TREND_SEED_ITEMS } from "@/lib/trends/seedCatalog";

const BASE = resolvePublicSiteUrl();

const STATIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/help", priority: 0.85, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.8, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/refund", priority: 0.4, changeFrequency: "monthly" },
];

export default async function sitemap() {
  const lastModified = new Date();
  const guidePaths = getGuideSitemapPaths()
    .filter((p) => p !== "/guides")
    .map((p) => ({
      path: p,
      priority: 0.82,
      changeFrequency: "weekly",
    }));
  let trendPaths = [];
  try {
    const catalog = await getTrendCatalog();
    trendPaths = (catalog?.items || []).map((item) => ({
      path: `/trend/${item.slug}`,
      priority: 0.76,
      changeFrequency: "daily",
    }));
  } catch {
    trendPaths = TREND_SEED_ITEMS.map((item) => ({
      path: `/trend/${item.slug}`,
      priority: 0.76,
      changeFrequency: "daily",
    }));
  }

  const paths = [...STATIC_PATHS, ...guidePaths, ...trendPaths];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
