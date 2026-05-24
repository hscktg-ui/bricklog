import { collectorResult } from "./base";

const RSS_FEEDS = [
  { id: "yonhap", url: "https://www.yonhapnews.co.kr/rss/news.xml" },
  { id: "hani", url: "https://www.hani.co.kr/rss/" },
];

function extractItems(xml, sourceId) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 40)) {
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ||
      block.match(/<title>([^<]+)<\/title>/i)?.[1];
    const link = block.match(/<link>([^<]+)<\/link>/i)?.[1];
    const desc =
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/is)?.[1] ||
      block.match(/<description>([^<]+)<\/description>/i)?.[1];
    if (!title || title.length < 4) continue;
    items.push({
      id: `${sourceId}-${items.length}`,
      source: "news",
      title: title.trim().replace(/\s+/g, " "),
      snippet: desc ? String(desc).slice(0, 200).trim() : "",
      url: link?.trim() || "",
      verified: true,
    });
  }
  return items;
}

export async function collectNewsRss() {
  const all = [];
  const errors = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "BRICLOG-TrendBot/1.0" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        errors.push(`${feed.id}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = extractItems(xml, feed.id);
      all.push(...items);
    } catch (e) {
      errors.push(`${feed.id}: ${e.message}`);
    }
  }

  return collectorResult("news", {
    ok: all.length > 0,
    items: all.slice(0, 80),
    error: all.length ? null : errors.join("; ") || "no_items",
    meta: { feeds: RSS_FEEDS.map((f) => f.id), count: all.length },
  });
}
