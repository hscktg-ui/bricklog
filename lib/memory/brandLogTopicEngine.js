/**
 * Brand Log Topic Engine — 브랜드 기록·기초 정보 → 지속 발행 주제
 * 범용 AI 프롬프트가 아니라 매장/브랜드에 쌓인 사실에서 오늘 쓸 소재를 뽑는다.
 */

function seasonLabel(month) {
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function normalizeTopicKey(text) {
  return String(text || "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function overlapsRecent(topic, recentTopics = []) {
  const key = normalizeTopicKey(topic);
  if (key.length < 6) return false;
  for (const prev of recentTopics) {
    const pk = normalizeTopicKey(prev);
    if (pk.length < 6) continue;
    const stem = pk.slice(0, Math.min(14, pk.length));
    if (key.includes(stem) || pk.includes(key.slice(0, Math.min(14, key.length)))) {
      return true;
    }
  }
  return false;
}

function splitSignalPhrases(text) {
  return String(text || "")
    .split(/[,，·/\n;|]+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 3 && s.length <= 56);
}

/** 브랜드 로그·폼·메모리에서 쓸 수 있는 사실 신호 추출 */
export function parseBrandLogSignals(ctx = {}) {
  const signals = [];
  const push = (text, source) => {
    for (const phrase of splitSignalPhrases(text)) {
      signals.push({ phrase, source });
    }
  };

  push(ctx.storeFeatures, "storeFeatures");
  push(ctx.brandDescription, "brandDescription");
  push(ctx.includePhrases, "includePhrases");
  push(ctx.services, "services");
  push(ctx.preferredKeywords, "preferredKeywords");
  push(ctx.differentiator, "differentiator");
  push(ctx.targetCustomer, "targetCustomer");

  if (Array.isArray(ctx.researchFacts)) {
    for (const f of ctx.researchFacts.slice(0, 12)) {
      const fact = String(f?.fact || f?.text || f || "").trim();
      if (fact.length >= 6 && fact.length <= 72) {
        signals.push({ phrase: fact, source: "research" });
      }
    }
  }

  const seen = new Set();
  return signals.filter(({ phrase }) => {
    const k = normalizeTopicKey(phrase);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * @param {object} ctx
 * @returns {{ topic: string, source: string, seed?: string }[]}
 */
export function buildBrandLogTopicCandidates(ctx = {}) {
  const brand = String(ctx.brandName || "").trim();
  const region = String(ctx.region || "").trim();
  const industry = String(ctx.industry || "").trim();
  const month = ctx.month || new Date().getMonth() + 1;
  const season = ctx.season || seasonLabel(month);
  const recentTopics = ctx.recentTopics || [];
  const signals = parseBrandLogSignals(ctx);
  const out = [];

  for (const { phrase, source } of signals.slice(0, 10)) {
    const core = phrase.replace(/\s+/g, " ").trim();
    out.push({
      topic: brand ? `${brand}, ${core}` : core,
      source: "brand_log",
      seed: core,
      logSource: source,
    });
    if (region && brand) {
      out.push({
        topic: `${region} ${brand} — ${core}`,
        source: "brand_log",
        seed: core,
        logSource: source,
      });
    }
  }

  if (brand) {
    out.push({
      topic: `${brand} 단골이 다시 찾는 이유`,
      source: "brand_log_series",
    });
    out.push({
      topic: `${season} ${brand}${industry ? ` ${industry}` : ""} 소식`,
      source: "brand_log_season",
    });
  }

  const filtered = out.filter((item) => !overlapsRecent(item.topic, recentTopics));
  return uniq(filtered.map((i) => JSON.stringify(i))).map((s) => JSON.parse(s));
}

/** 작성 화면 칩용 — 짧은 주제 문자열 */
export function buildBrandLogSuggestionChips(ctx = {}, limit = 5) {
  return buildBrandLogTopicCandidates(ctx)
    .map((t) => t.topic)
    .slice(0, limit);
}

/** API·스튜디오용 — 오늘/이번 주/시리즈 묶음 */
export function buildBrandLogTopicPack(ctx = {}) {
  const candidates = buildBrandLogTopicCandidates(ctx);
  const today = candidates.slice(0, 3);
  const week = candidates.slice(0, 6);
  const series = candidates
    .filter((c) => c.source === "brand_log_series" || c.logSource === "research")
    .slice(0, 4);

  return {
    brandLog: true,
    signalCount: parseBrandLogSignals(ctx).length,
    today: today.map((t) => ({ topic: t.topic, source: t.source })),
    week: week.map((t) => ({ topic: t.topic, channels: ["blog"] })),
    series: series.map((t) => ({ topic: t.topic, channels: ["blog"] })),
    chips: buildBrandLogSuggestionChips(ctx, 6),
  };
}

/** generation pipeline — 브랜드 메모리를 입력 축에 병합 */
export function mergeBrandLogIntoInput(input = {}, brand = {}) {
  if (!brand || typeof brand !== "object") return input;
  const next = { ...input };

  const pairs = [
    ["brandName", brand.brandName],
    ["region", brand.region],
    ["industry", brand.industry],
    ["mainKeyword", brand.mainKeyword],
    ["storeFeatures", brand.storeFeatures || brand.brandDescription],
    ["brandDescription", brand.brandDescription],
    ["includePhrases", brand.includePhrases],
    ["forbiddenWords", brand.forbiddenWords || brand.bannedWords],
  ];

  for (const [key, val] of pairs) {
    const v = String(val || "").trim();
    if (v && !String(next[key] || "").trim()) next[key] = v;
  }

  if (!next.brandMemory && brand.brandName) {
    next.brandMemory = brand;
  }
  if (!next.brandId && brand.id) {
    next.brandId = brand.id;
  }

  return next;
}
