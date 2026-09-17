import { getLiveSourceConfigs } from "@/lib/trends/liveConfig";

const HTTP_HEADERS = {
  "User-Agent": "BRICLOG-TrendBot/2.0 (+https://briclog.ai)",
  Accept: "application/json, text/plain, application/xml, text/xml;q=0.9, */*;q=0.8",
};

const OFFICIAL_RSS_FEEDS = [
  { id: "openai", url: "https://openai.com/news/rss.xml" },
  { id: "anthropic", url: "https://www.anthropic.com/news/rss.xml" },
  { id: "google-blog-ai", url: "https://blog.google/technology/ai/rss/" },
  { id: "huggingface-blog", url: "https://huggingface.co/blog/feed.xml" },
];

const NEWS_RSS_FEEDS = [
  { id: "techcrunch-ai", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { id: "verge-ai", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { id: "wired-ai", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9가-힣+.#/\-\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasToRegex(alias) {
  const normalized = normalizeText(alias).replace(/\s+/g, "\\s+");
  if (!normalized) return null;
  return new RegExp(`(^|[^a-z0-9가-힣])${normalized}([^a-z0-9가-힣]|$)`, "i");
}

function buildTrackedMatchers(trackedItems) {
  return trackedItems.map((item) => {
    const aliases = Array.from(
      new Set([
        item.name,
        item.slug,
        item.slug?.replace(/-/g, " "),
        ...(item.aliases || []),
      ].filter(Boolean))
    );
    return {
      slug: item.slug,
      name: item.name,
      aliases,
      regexes: aliases.map(aliasToRegex).filter(Boolean),
    };
  });
}

function matchTrackedEntities(text, trackedMatchers) {
  const normalized = normalizeText(text);
  return trackedMatchers
    .filter((item) => item.regexes.some((regex) => regex.test(normalized)))
    .map((item) => ({ slug: item.slug, name: item.name }));
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...HTTP_HEADERS,
      ...(init.headers || {}),
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchText(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...HTTP_HEADERS,
      ...(init.headers || {}),
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

function extractRssItems(xml, source) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocks.slice(0, 40).map((block, index) => {
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ||
      block.match(/<title>([^<]+)<\/title>/i)?.[1] ||
      "";
    const link = block.match(/<link>([^<]+)<\/link>/i)?.[1] || "";
    const description =
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/is)?.[1] ||
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ||
      "";
    const pubDate = block.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1] || "";
    return {
      id: `${source}-${index}`,
      title: title.trim().replace(/\s+/g, " "),
      description: description.trim().replace(/\s+/g, " "),
      url: link.trim(),
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    };
  }).filter((item) => item.title);
}

function buildSourceStatus(base, patch) {
  return {
    sourceName: base.id,
    label: base.label,
    enabled: base.enabled,
    lastAttempt: new Date().toISOString(),
    lastSuccess: null,
    lastError: null,
    responseTime: null,
    recordsCollected: 0,
    hourlyBudget: base.hourlyBudget,
    hourlyUsed: 0,
    dailyBudget: base.dailyBudget,
    dailyUsed: 0,
    signals: [],
    ...patch,
  };
}

function metricKeyForSource(sourceId) {
  if (sourceId === "github") return "developerMomentum";
  if (sourceId === "reddit") return "communityMomentum";
  if (sourceId === "youtube") return "mediaMomentum";
  if (sourceId === "huggingface") return "modelActivity";
  if (sourceId === "producthunt") return "searchMomentum";
  if (sourceId === "official") return "officialMomentum";
  return "mediaMomentum";
}

function scoreForRank(index, scale = 1) {
  return Math.max(0.2, scale * (1 - index / 20));
}

function toSignalEntries(sourceId, matches, entry, index, scale = 1) {
  const metric = metricKeyForSource(sourceId);
  return matches.map((match) => ({
    trendSlug: match.slug,
    source: sourceId,
    metric,
    value: Number(scoreForRank(index, scale).toFixed(4)),
    change: null,
    payload: {
      title: entry.title || entry.name || entry.repo || "",
      url: entry.url || entry.link || "",
      sourceId,
      rank: index + 1,
      publishedAt: entry.publishedAt || entry.timestamp || new Date().toISOString(),
    },
    recordedAt: entry.publishedAt || entry.timestamp || new Date().toISOString(),
  }));
}

async function collectHuggingFace(config, trackedMatchers) {
  if (!config.enabled) return buildSourceStatus(config);
  const started = Date.now();
  try {
    const body = await fetchJson("https://huggingface.co/api/trending");
    const pools = [
      ...(body?.recentlyTrending || []),
      ...(body?.models || []),
      ...(body?.spaces || []),
    ];
    const signals = [];
    pools.slice(0, 40).forEach((row, index) => {
      const repo = row?.repoData?.id || row?.repo || row?.title || "";
      const text = [
        repo,
        row?.repoData?.author,
        ...(row?.repoData?.tags || []),
      ].filter(Boolean).join(" ");
      const matches = matchTrackedEntities(text, trackedMatchers);
      if (!matches.length) return;
      signals.push(
        ...toSignalEntries(
          "huggingface",
          matches,
          {
            title: repo,
            url: row?.repoData?.url || `https://huggingface.co/${repo}`,
            publishedAt: new Date().toISOString(),
          },
          index,
          1.2
        )
      );
    });
    return buildSourceStatus(config, {
      lastSuccess: new Date().toISOString(),
      responseTime: Date.now() - started,
      recordsCollected: signals.length,
      hourlyUsed: 1,
      dailyUsed: 1,
      signals,
    });
  } catch (error) {
    return buildSourceStatus(config, {
      responseTime: Date.now() - started,
      lastError: error.message || "huggingface_failed",
    });
  }
}

async function collectRssFeeds(config, feeds, sourceId, trackedMatchers, scale) {
  if (!config.enabled) return buildSourceStatus(config);
  const started = Date.now();
  const errors = [];
  const signals = [];

  for (const feed of feeds) {
    try {
      const xml = await fetchText(feed.url);
      extractRssItems(xml, `${sourceId}-${feed.id}`).forEach((entry, index) => {
        const matches = matchTrackedEntities(
          `${entry.title} ${entry.description}`,
          trackedMatchers
        );
        if (!matches.length) return;
        signals.push(...toSignalEntries(sourceId, matches, entry, index, scale));
      });
    } catch (error) {
      errors.push(`${feed.id}:${error.message}`);
    }
  }

  return buildSourceStatus(config, {
    lastSuccess: errors.length === feeds.length ? null : new Date().toISOString(),
    lastError: errors.length && errors.length === feeds.length ? errors.join("; ") : null,
    responseTime: Date.now() - started,
    recordsCollected: signals.length,
    hourlyUsed: feeds.length,
    dailyUsed: feeds.length,
    signals,
  });
}

async function collectGithub(config, trackedMatchers) {
  if (!config.enabled) return buildSourceStatus(config);
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return buildSourceStatus(config, {
      lastError: `missing_env:${config.envKey}`,
    });
  }
  const started = Date.now();
  const errors = [];
  const signals = [];

  for (const item of trackedMatchers.slice(0, config.hourlyBudget)) {
    try {
      const q = encodeURIComponent(`"${item.name}" AI in:name,description,readme`);
      const url = `https://api.github.com/search/repositories?q=${q}&sort=updated&order=desc&per_page=5`;
      const body = await fetchJson(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const value = Math.min(5, Number(body?.total_count || 0));
      if (!value) continue;
      signals.push({
        trendSlug: item.slug,
        source: "github",
        metric: "developerMomentum",
        value,
        change: null,
        payload: {
          title: item.name,
          url: `https://github.com/search?q=${encodeURIComponent(item.name)}`,
          sourceId: "github",
          resultCount: body?.total_count || 0,
        },
        recordedAt: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${item.slug}:${error.message}`);
    }
  }

  return buildSourceStatus(config, {
    lastSuccess: errors.length === trackedMatchers.slice(0, config.hourlyBudget).length ? null : new Date().toISOString(),
    lastError: errors.length && errors.length === trackedMatchers.slice(0, config.hourlyBudget).length ? errors.join("; ") : null,
    responseTime: Date.now() - started,
    recordsCollected: signals.length,
    hourlyUsed: trackedMatchers.slice(0, config.hourlyBudget).length,
    dailyUsed: trackedMatchers.slice(0, config.hourlyBudget).length,
    signals,
  });
}

async function collectYoutube(config, trackedMatchers, bucketDate) {
  if (!config.enabled) return buildSourceStatus(config);
  const key = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!key) {
    return buildSourceStatus(config, { lastError: `missing_env:${config.envKey}` });
  }
  const started = Date.now();
  const signals = [];
  const errors = [];
  const offset = bucketDate.getUTCHours() % Math.max(1, trackedMatchers.length);
  const targets = trackedMatchers.slice(offset, offset + config.hourlyBudget);

  for (const item of targets) {
    try {
      const q = encodeURIComponent(item.name);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=5&q=${q}&key=${encodeURIComponent(key)}`;
      const body = await fetchJson(url);
      const count = Array.isArray(body?.items) ? body.items.length : 0;
      if (!count) continue;
      signals.push({
        trendSlug: item.slug,
        source: "youtube",
        metric: "mediaMomentum",
        value: count,
        change: null,
        payload: {
          title: item.name,
          url: `https://www.youtube.com/results?search_query=${q}`,
          sourceId: "youtube",
        },
        recordedAt: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${item.slug}:${error.message}`);
    }
  }

  return buildSourceStatus(config, {
    lastSuccess: errors.length === targets.length ? null : new Date().toISOString(),
    lastError: errors.length && errors.length === targets.length ? errors.join("; ") : null,
    responseTime: Date.now() - started,
    recordsCollected: signals.length,
    hourlyUsed: targets.length,
    dailyUsed: targets.length,
    signals,
  });
}

async function collectReddit(config) {
  if (!config.enabled) return buildSourceStatus(config);
  if (!process.env.REDDIT_CLIENT_ID?.trim()) {
    return buildSourceStatus(config, { lastError: `missing_env:${config.envKey}` });
  }
  return buildSourceStatus(config, {
    lastError: "oauth_collector_not_enabled_in_mvp",
  });
}

async function collectProductHunt(config) {
  if (!config.enabled) return buildSourceStatus(config);
  if (!process.env.PRODUCT_HUNT_TOKEN?.trim()) {
    return buildSourceStatus(config, { lastError: `missing_env:${config.envKey}` });
  }
  return buildSourceStatus(config, {
    lastError: "graphql_collector_not_enabled_in_mvp",
  });
}

export async function collectLiveSourceBundle({ trackedItems, bucketDate = new Date() }) {
  const trackedMatchers = buildTrackedMatchers(trackedItems);
  const sourceConfigs = getLiveSourceConfigs();
  const configById = Object.fromEntries(sourceConfigs.map((source) => [source.id, source]));

  const statuses = await Promise.all([
    collectHuggingFace(configById.huggingface, trackedMatchers),
    collectRssFeeds(configById.official, OFFICIAL_RSS_FEEDS, "official", trackedMatchers, 1.35),
    collectRssFeeds(configById.news, NEWS_RSS_FEEDS, "news", trackedMatchers, 1.05),
    collectGithub(configById.github, trackedMatchers),
    collectYoutube(configById.youtube, trackedMatchers, bucketDate),
    collectReddit(configById.reddit),
    collectProductHunt(configById.producthunt),
  ]);

  return {
    trackedMatchers,
    sourceConfigs,
    sourceStatuses: statuses,
    signals: statuses.flatMap((status) => status.signals || []),
  };
}
