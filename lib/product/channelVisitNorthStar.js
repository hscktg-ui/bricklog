/**
 * Channel Visit North Star — 플레이스·인스타 GPT 품질 vs 로컬 엔진 스팸 SSOT
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { enrichChannelInput, resolveChannelBrandName } from "@/lib/content/channelBrandResolve";
import {
  assessEngineSpamDraft,
  ENGINE_SPAM_HARD_RES,
} from "@/lib/product/columnVisitNorthStar";

export const CHANNEL_VISIT_NORTH_STAR_VERSION = "channel-visit-north-star-v1";

/** 채널 전용 스팸 — 1회라도 송출 금지 */
export const CHANNEL_SPAM_HARD_RES = [
  ...ENGINE_SPAM_HARD_RES,
  { id: "compare_suwol", re: /비교·예약\s*판단이\s*수월/g, max: 0 },
  { id: "criteria_compare", re: /기준으로\s*보면\s*비교/g, max: 0 },
  { id: "search_only", re: /검색만\s*하다\s*보면/g, max: 0 },
  { id: "local_store", re: /로컬\s*매장\s*운영/g, max: 0 },
  { id: "bullet_leak", re: /^>\s*·/gm, max: 0 },
  { id: "notice_template", re: /관련해\s*이번\s*달\s*확인할\s*포인트/g, max: 0 },
  { id: "choice_suwol", re: /선택이\s*수월/g, max: 0 },
  { id: "compare_visit", re: /직접\s*비교해\s*보세요/g, max: 1 },
];

function topicHead(input = {}) {
  const raw = String(
    input.topic || input.mainKeyword || input.placeHeadline || "소식"
  ).trim();
  return raw.split(/[,，]/)[0]?.trim() || raw;
}

function facilityLabel(topic = "") {
  return String(topic || "")
    .replace(/\s*오픈.*$/i, "")
    .trim() || topic;
}

function locationLabel(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  if (!region || brand.includes(region)) return brand;
  return `${region} ${brand}`;
}

function cleanFactLine(line = "") {
  return String(line || "")
    .replace(/^·\s*/, "")
    .replace(/\s*—\s*[^.\n]+기준으로\s*보면[^.\n]*/g, "")
    .replace(/\s*—\s*비교·예약\s*판단이\s*수월해요\.?/g, "")
    .trim();
}

export function buildPlaceNorthStarPromptBlock() {
  return `【플레이스 목표 품질 — 스마트플레이스 공지】
짧은 매장 공지 4~6문단. 불릿(·)·SEO·후기 톤 금지.

형식:
- title: 이모지 1개 + 브랜드 + 주제 (44자 이내)
- shortNotice: 오픈·소식 한 줄 (120자)
- detailBody: 3~4개 짧은 문단 + 마지막 📍브랜드 / 📞문의 안내

절대 금지: "근처목마", "· 팩트 나열", "비교·예약 판단이 수월", "기준으로 보면", "로컬 매장 운영"`;
}

export function buildInstagramNorthStarPromptBlock() {
  return `【인스타 목표 품질 — 감성 캡션】
hook 1줄 + 짧은 줄바꿈 본문 6~10줄 + 해시태그 4~6개.

리듬: 한 줄에 한 생각. "~없이," "~함께." 같은 짧은 호흡.
절대 금지: 동일 문장 반복, "— 기준으로 보면 비교·예약", "검색만 하다 보면", 블로그 톤`;
}

export function assessChannelEngineSpam(text = "") {
  const full = String(text || "");
  const violations = [];

  const base = assessEngineSpamDraft(full);
  if (!base.ok) violations.push(...base.violations);

  for (const rule of CHANNEL_SPAM_HARD_RES) {
    if (ENGINE_SPAM_HARD_RES.some((e) => e.id === rule.id)) continue;
    const count = (full.match(rule.re) || []).length;
    if (count > rule.max) {
      violations.push({ id: rule.id, count, max: rule.max });
    }
  }

  const bulletLines = (full.match(/^\s*·\s+/gm) || []).length;
  if (bulletLines >= 2) {
    violations.push({ id: "place_bullet_spam", count: bulletLines, max: 1 });
  }

  return {
    ok: violations.length === 0,
    violations,
    version: CHANNEL_VISIT_NORTH_STAR_VERSION,
  };
}

function scorePlaceShape(pack = {}) {
  const detail = String(pack.detailBody || "");
  const paras = detail.split(/\n\n+/).filter((p) => p.trim().length >= 8);
  const hasFooter = /📍|문의/.test(detail);
  const noBullets = !/^\s*·\s+/m.test(detail);
  let score = 40;
  if (paras.length >= 2 && paras.length <= 6) score += 20;
  if (hasFooter) score += 15;
  if (noBullets) score += 15;
  if (String(pack.shortNotice || "").length >= 12) score += 10;
  return { ok: score >= 65, score, paras: paras.length, hasFooter, noBullets };
}

function scoreInstagramShape(pack = {}) {
  const body = String(pack.lineBreakBody || pack.body || "");
  const lines = body.split(/\n+/).filter((l) => l.trim().length >= 4);
  const tags = Array.isArray(pack.hashtags) ? pack.hashtags : [];
  let score = 35;
  if (lines.length >= 4 && lines.length <= 14) score += 25;
  if (String(pack.hook || "").length >= 8) score += 15;
  if (tags.length >= 3 && tags.length <= 10) score += 15;
  const dupHook =
    pack.hook &&
    body.includes(String(pack.hook).trim()) &&
    body.split(String(pack.hook).trim()).length > 2;
  if (dupHook) score -= 20;
  return { ok: score >= 60, score, lines: lines.length, tagCount: tags.length };
}

export function assessChannelVisitNorthStar(pack, channel = "place", input = {}) {
  const full = getChannelFullText(pack, channel);
  const spam = assessChannelEngineSpam(full);
  const chars = full.replace(/\s/g, "").length;
  const shape =
    channel === "instagram"
      ? scoreInstagramShape(pack)
      : scorePlaceShape(pack);

  const issues = [];
  if (!spam.ok) issues.push({ type: "channel_engine_spam", violations: spam.violations });
  if (!shape.ok) issues.push({ type: "channel_shape_weak", shape });
  if (chars < (channel === "instagram" ? 80 : 100)) issues.push({ type: "too_short" });

  const brand = String(input.brandName || "").trim();
  if (brand && !full.includes(brand)) {
    issues.push({ type: "brand_missing" });
  }

  const publishOk = spam.ok && shape.ok && chars >= (channel === "instagram" ? 80 : 100);

  return {
    ok: publishOk,
    publishOk,
    shouldWithhold: !spam.ok || chars < 60,
    spam,
    shape,
    issues,
    channel,
    version: CHANNEL_VISIT_NORTH_STAR_VERSION,
  };
}

/**
 * 조사·입력 기반 깨끗한 플레이스 공지 (로컬 스팸 tail 없음)
 */
export function buildNorthStarPlacePack(input = {}, factLines = []) {
  input = enrichChannelInput(input);
  const brand = resolveChannelBrandName(input);
  const region = String(input.region || "").trim();
  const topic = topicHead(input);
  const facts = (factLines || []).map(cleanFactLine).filter(Boolean);
  const facility = facilityLabel(topic);

  const emoji = /수영|물놀이|풀/.test(topic) ? "🏊 " : "";
  const title = `${emoji}${brand} ${topic}`.replace(/\s+/g, " ").trim().slice(0, 44);

  const openTopic = /오픈|신규|리뉴얼|개장/.test(`${topic} ${facts.join(" ")}`);
  const shortNotice = (
    openTopic
      ? `날씨 걱정 없이 즐길 수 있는 ${facility}이 새롭게 오픈했습니다.`
      : facts[0] || `${brand} ${topic} 소식을 안내드립니다.`
  ).slice(0, 120);

  const paragraphs = [];
  if (openTopic && !shortNotice.includes("가족")) {
    paragraphs.push(
      "가족 나들이, 물놀이, 휴식을 한 번에 즐길 수 있도록 준비했으며 기존 야외시설과 함께 이용 가능합니다."
    );
  }
  if (!openTopic) {
    for (const fact of facts.slice(0, 3)) {
      const line =
        fact.endsWith(".") || fact.endsWith("요") || fact.endsWith("다") ? fact : `${fact}.`;
      if (!paragraphs.some((p) => p.includes(line.slice(0, 12)))) paragraphs.push(line);
    }
  } else if (facts.some((f) => /식사|카페|식음|커피|휴식/.test(f)) || openTopic) {
    paragraphs.push(
      `${brand}는 ${facility.includes("수영") ? "수영장" : facility}뿐 아니라 식사, 카페, 휴식공간까지 함께 운영되는 복합 문화공간입니다.`
    );
  }
  if (!paragraphs.some((p) => p.includes(brand)) && !openTopic) {
    paragraphs.push(
      `${brand}는 ${topic}뿐 아니라 식사, 카페, 휴식공간까지 함께 운영되는 복합 문화공간입니다.`
    );
  }
  paragraphs.push("주말 방문 및 단체 이용은 사전 문의를 추천드립니다.");
  paragraphs.push(
    `📍 ${locationLabel(input)}\n📞 문의 후 방문 시 더욱 편리하게 이용 가능합니다.`
  );

  const detailBody = paragraphs.join("\n\n").slice(0, 520);

  return {
    title,
    shortNotice,
    detailBody,
    shortBody: shortNotice,
    body: [shortNotice, detailBody].filter(Boolean).join("\n\n"),
    tags: [region, brand, topic]
      .filter(Boolean)
      .slice(0, 5)
      .map((t) => `#${String(t).replace(/\s+/g, "")}`),
    _meta: {
      channelNorthStarPack: true,
      channel: "place",
      researchFactCount: facts.length,
    },
  };
}

/**
 * 조사·입력 기반 깨끗한 인스타 캡션
 */
export function buildNorthStarInstagramPack(input = {}, instaToneKey = "emotional", factLines = []) {
  input = enrichChannelInput(input);
  const brand = resolveChannelBrandName(input);
  const region = String(input.region || "").trim();
  const topic = topicHead(input);
  const facts = (factLines || []).map(cleanFactLine).filter(Boolean);
  const facility = facilityLabel(topic);
  const openTopic = /오픈|수영|물놀이/.test(`${topic} ${facts.join(" ")}`);

  const hook = (
    openTopic
      ? "🏊 물놀이의 계절이 돌아왔습니다."
      : `${region ? `${region} ` : ""}${topic} — ${brand}`
  ).slice(0, 56);

  const lines = [];
  if (openTopic) {
    lines.push(`${brand} ${facility}이 새롭게 오픈했습니다.`);
    lines.push("햇빛 걱정 없이,");
    lines.push("날씨 걱정 없이,");
    lines.push("가족과 함께 편하게 즐길 수 있는 공간.");
    if (
      facts.some((f) => /식사|카페|커피|식음|휴식/.test(f)) ||
      /수영|물놀이|풀/.test(facility)
    ) {
      lines.push("수영 후에는 식사도,");
      lines.push("커피 한 잔의 여유도 함께.");
    }
    lines.push("올여름,");
    lines.push(`${brand}에서 특별한 하루를내보세요 🌿`);
  } else {
    lines.push(`${brand} ${topic} 소식 전해요.`);
    for (const fact of facts.slice(0, 4)) {
      lines.push(cleanFactLine(fact));
    }
    lines.push(
      instaToneKey === "informative"
        ? "저장해 두었다가 방문 전에 다시 보면 편해요."
        : `마음에 드는 날, ${brand}에서 만나요.`
    );
  }

  const lineBreakBody = lines.join("\n\n");
  const hashtags = [
    brand,
    topic.split(/\s+/)[0],
    region ? `${region}가볼만한곳` : null,
    region ? `${region}여행` : null,
    "가족나들이",
  ]
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => `#${String(t).replace(/\s+/g, "")}`);

  return {
    hook,
    body: lineBreakBody,
    lineBreakBody,
    ending: brand,
    hashtags,
    _meta: {
      channelNorthStarPack: true,
      channel: "instagram",
      researchFactCount: facts.length,
    },
  };
}
