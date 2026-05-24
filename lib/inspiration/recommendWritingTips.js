import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { getTodayInspiration } from "@/lib/inspiration/todayInspiration";
import { extractTopicTokens } from "@/lib/inspiration/topicScopedInspiration";

const TIP_VISIT_KEY = "briclog-context-tips-visit";

function visitBucket() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(TIP_VISIT_KEY);
    const n = raw !== null ? parseInt(raw, 10) : 0;
    const next = Number.isNaN(n) ? 1 : n + 1;
    sessionStorage.setItem(TIP_VISIT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

function relevanceScore(text, tokens) {
  if (!tokens.length) return 1;
  const hay = String(text || "").toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    const key = tok.toLowerCase();
    if (hay.includes(key)) score += Math.min(key.length, 8);
  }
  return score;
}

function pickDiverse(pool, count, seed, usedKinds, rules = {}) {
  const out = [];
  const usedIds = new Set();
  const sorted = [...pool].sort(
    (a, b) => (b._score ?? 0) - (a._score ?? 0) || a.id.localeCompare(b.id)
  );

  for (const rule of rules.must || []) {
    const hit = sorted.find((c) => rule(c) && !usedIds.has(c.id));
    if (hit) {
      out.push(hit);
      usedIds.add(hit.id);
      if (hit.kind) usedKinds.add(hit.kind);
    }
  }

  for (let i = 0; sorted.length && out.length < count; i++) {
    const idx = (seed + i * 7) % sorted.length;
    const item = sorted[idx];
    if (usedIds.has(item.id)) continue;
    if (item.kind === "timeliness" && usedKinds.has("timeliness")) continue;
    out.push(item);
    usedIds.add(item.id);
    if (item.kind) usedKinds.add(item.kind);
  }

  for (const item of sorted) {
    if (out.length >= count) break;
    if (usedIds.has(item.id)) continue;
    if (item.kind === "timeliness" && usedKinds.has("timeliness")) continue;
    out.push(item);
    usedIds.add(item.id);
    if (item.kind) usedKinds.add(item.kind);
  }

  return out.slice(0, count);
}

/**
 * 입력·브랜드·이력 기반 TIP 3~4개 (시의성 최대 1, 브랜드 최소 1)
 */
export function buildSessionWritingTips(options = {}) {
  const date = options.date
    ? new Date(`${options.date}T12:00:00`)
    : new Date();
  const seed = visitBucket();
  const brand = String(options.brandName || "").trim();
  const region = String(options.region || "").trim();
  const industry = String(
    options.industryLabel || options.industryKey || ""
  ).trim();
  const topic = String(options.topic || "").trim();
  const mainKeyword = String(options.mainKeyword || "").trim();
  const subKeyword = String(options.subKeyword || "").trim();
  const includePhrases = String(options.includePhrases || "").trim();
  const tokens = extractTopicTokens(
    topic,
    mainKeyword,
    subKeyword,
    includePhrases
  );

  const season = getActiveSeasonContext(date);
  const base = getTodayInspiration({
    date: options.contentDate,
    industryKey: options.industryKey,
    brandName: brand,
  });

  const candidates = [];

  candidates.push({
    id: "season",
    kind: "timeliness",
    text: `TIP · ${season.label} — ${season.eventLabel || "이번 달 흐름"}에 맞는 장면이나 혜택을 한 줄만 넣어 보세요.`,
  });

  if (base.stories[0]) {
    candidates.push({
      id: "today",
      kind: "timeliness",
      text: `TIP · 오늘 (${base.dateLabel}) — 「${base.stories[0].title}」처럼 손님이 처음 떠올리는 상황부터 쓰면 읽기 편해요.`,
    });
  }

  if (options.trendLine) {
    candidates.push({
      id: "trend",
      kind: "timeliness",
      text: `TIP · 요즘 ${options.trendLine} — 주제와 연결되는 한 가지 포인트만 넣어 보세요.`,
    });
  }

  const brandTone =
    options.brandTone ||
    options.differentiator ||
    options.brandPhilosophy ||
    "";
  const services = String(options.services || "").trim();
  const targetCustomer = String(options.targetCustomer || "").trim();

  if (brand) {
    candidates.push({
      id: "brand",
      kind: "brand",
      text: brandTone
        ? `TIP · ${brand} — ${brandTone.slice(0, 48)}${brandTone.length > 48 ? "…" : ""} 포인트를 본문 한곳에만 자연스럽게 넣어 보세요.`
        : `TIP · ${brand} 이름과 지역·차별점을 도입부와 중간에 한 번씩만 언급해 보세요.`,
    });
  }

  if (services && brand) {
    candidates.push({
      id: "brand-services",
      kind: "brand",
      text: `TIP · ${brand} — ${services.slice(0, 40)}${services.length > 40 ? "…" : ""} 중 손님이 궁금해할 한 가지만 골라 쓰세요.`,
    });
  }

  if (targetCustomer && brand) {
    candidates.push({
      id: "brand-audience",
      kind: "brand",
      text: `TIP · ${brand} — ${targetCustomer.slice(0, 36)} 손님이 검색할 표현을 주제·제목에 넣어 보세요.`,
    });
  }

  if (region && brand) {
    candidates.push({
      id: "local",
      kind: "brand",
      text: `TIP · ${region} ${brand} — 동네 손님이 검색할 법한 표현(지역+업종)을 제목 후보에 넣어 보세요.`,
    });
  }

  const recent = (options.recentTopics || []).filter(Boolean).slice(0, 3);
  if (recent.length) {
    candidates.push({
      id: "history",
      kind: "history",
      text: `TIP · 최근에 쓰신 「${recent[0]}」와 겹치지 않게, 이번엔 다른 장면·계절 포인트를 골라 보세요.`,
    });
  } else if ((options.generationCount || 0) > 0) {
    candidates.push({
      id: "usage",
      kind: "history",
      text: `TIP · 지금까지 ${options.generationCount}번 쌓으셨네요. 지난 초안 톤을 이어가려면 「포함할 내용」에 반복하고 싶은 문장을 적어 주세요.`,
    });
  } else {
    candidates.push({
      id: "first",
      kind: "history",
      text: "TIP · 첫 글이라면 ‘누가·언제·왜 찾는지’ 장면 한 가지만 잡아도 충분해요.",
    });
  }

  if (topic) {
    const short = topic.length > 24 ? `${topic.slice(0, 24)}…` : topic;
    candidates.push({
      id: "topic",
      kind: "topic",
      text: `TIP · 입력 주제 「${short}」 — 고유명사·지명은 제목과 첫 문단에 꼭 넣어 보세요.`,
    });
    if (tokens.length >= 2) {
      candidates.push({
        id: "topic-keywords",
        kind: "topic",
        text: `TIP · 「${tokens.slice(0, 2).join("」「")}」 — 비교·선택할 때 보는 포인트 하나를 깊게 쓰면 검색·읽기 모두 좋아요.`,
      });
    }
  } else if (mainKeyword) {
    candidates.push({
      id: "keyword",
      kind: "topic",
      text: `TIP · 키워드 「${mainKeyword.slice(0, 20)}」 — 제목·첫 문단·소제목 중 한곳에만 자연스럽게 넣어 보세요.`,
    });
  }

  if (industry) {
    candidates.push({
      id: "industry",
      kind: "brand",
      text: `TIP · ${industry} 업종 — 손님이 비교할 때 보는 포인트(가격·위치·분위기) 중 하나만 골라 깊게 쓰세요.`,
    });
  }

  candidates.push({
    id: "naver",
    kind: "general",
    text: "TIP · 네이버 글은 키워드 나열보다 ‘방문 전 궁금한 것’에 답하는 흐름이 잘 읽혀요.",
  });

  candidates.push({
    id: "scene",
    kind: "general",
    text: "TIP · 아래 추천 칩을 누르면 주제·포함할 내용에 바로 넣을 수 있어요.",
  });

  const scored = candidates.map((c) => ({
    ...c,
    _score:
      relevanceScore(c.text, tokens) +
      (c.kind === "topic" && tokens.length ? 6 : 0) +
      (c.kind === "brand" && brand ? 4 : 0) +
      (c.kind === "history" && !tokens.length ? 2 : 0),
  }));

  const usedKinds = new Set();
  const tips = pickDiverse(scored, 4, seed, usedKinds, {
    must: [
      (c) => c.kind === "brand" && brand,
      (c) =>
        c.kind === "timeliness" &&
        (tokens.length === 0 || relevanceScore(c.text, tokens) > 0),
    ],
  });

  const previewLine = tips
    .map((t) => t.text.replace(/^TIP ·\s*/, ""))
    .join(" · ");

  return { tips, previewLine, seed };
}
