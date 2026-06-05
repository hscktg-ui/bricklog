import { resolvePublicSiteUrl } from "@/lib/brand/seo";

const BASE = resolvePublicSiteUrl();

export default function sitemap() {
  const lastModified = new Date();
  const paths = ["", "/terms", "/privacy", "/refund"];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
