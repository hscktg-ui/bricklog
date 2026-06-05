/**
 * BRICLOG Core Quality Engine — 100점 만점, 95점 미만 재작성 연동
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  countBlogBodyCharsWithSpaces,
} from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS, resolveBlogLengthTier } from "@/lib/constants";
import { scoreHumanDeliveryHeuristics } from "@/lib/content/humanDeliveryRules";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { V4_AI_CLICHES } from "@/lib/quality/v4ContentAudit";
import { hasTemplatePlaceholder } from "@/lib/quality/placeholderGuard";
import { scoreSearchIntent } from "@/lib/quality/v4ContentAudit";
import { evaluateCustomerQuestionDelivery } from "@/lib/content/customerQuestionEngine";
import {
  detectSpeechStyleMixing,
  resolveSpeechStyle,
  SPEECH_STYLE_OPTIONS,
} from "@/lib/constitution/writingConstitutionV2";
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { resolveEmotionTemperature } from "@/lib/emotion/emotionTemperature";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { isLengthOnlyGateSoft } from "@/lib/product/briclogMission";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { scoreInputTopicDominance } from "@/lib/content/v17ContentGate";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { getChannelFullText } from "@/lib/content/channelPack";
import { hasMetaPhilosophyLeak } from "@/lib/content/metaLayerSeparation";
import { detectExcessiveRepetition } from "@/lib/content/repetitionEngine";
import { scoreIndustryDensity } from "@/lib/content/industryDensityEngine";
import { scoreRegionDensity } from "@/lib/content/regionDensityEngine";

import { getCoreMaxRewrites as getPipelineMaxRewrites } from "@/lib/config/briclogFastPipeline";

export const CORE_TARGET_SCORE = 95;
export const CORE_MAX_REWRITES = getPipelineMaxRewrites();

export const CORE_PLACEHOLDER_RE = {
  test(text) {
    return hasTemplatePlaceholder(text) || /\{\{|\}\}/.test(String(text || ""));
  },
};

export const CORE_AI_CLICHES = [
  ...V4_AI_CLICHES,
  "특별한 경험",
  "소중한 순간",
  "행복을 더하다",
  "감동을 선사하다",
  "가치를 전달하다",
  "풍요롭게 만들다",
  "깊은 유대감",
  "일상의 활력",
  "마음을 전하다",
  "따뜻한 공간",
  "특별한 시간",
  "의미 있는 순간",
  "행복한 시간",
];

const CORE_BUSINESS_BANNED = [
  "햇살이 따뜻하게",
  "커피 한 잔",
  "설레는 마음",
  "피곤한 몸",
  "따뜻한 분위기",
  "새로운 시작",
  "여러분의 이야기를",
  "새로운 세계",
  "즐거운 경험",
];

const BRICLOG_REQUIRED_KEYWORDS = [
  "브랜드 기억",
  "브랜드 메모리",
  "콘텐츠 축적",
  "브랜드 일관성",
  "브랜드 맥락",
  "SEO는 결과",
];

const BRICLOG_GENERIC_PATTERNS = [
  /사용자\s*친화적\s*인터페이스/,
  /초보자(도)?\s*쉽게/,
  /전국(적으로)?\s*어디서나/,
  /커뮤니티\s*기능/,
  /글쓰기\s*챌린지/,
  /블로그를\s*시작해보세요/,
];
const BRICLOG_SLOGAN_LINES = [
  /SEO는 결과이며, 본문은 브랜드 맥락과 실행 가능성 중심으로 구성합니다\./,
  /브랜드 메모리와 누적 콘텐츠 맥락을 기준으로 같은 방향성을 유지합니다\./,
];

const FAKE_LOCATION_MARKERS = [
  "서울",
  "강남",
  "홍대",
  "한강",
  "한강공원",
  "파주",
  "운정",
  "일산",
  "부산",
  "제주",
  "경기",
  "수원",
  "인천",
];

const OFFICIAL_OPENERS = [
  /안내드립니다/,
  /공식/,
  /고객님께/,
  /본 매장은/,
];
const REVIEW_OPENERS = [/다녀왔/, /써봤/, /느꼈/, /직접 가/];
const AD_OPENERS = [/지금 바로/, /놓치지 마/, /최고의 선택/];
const FURNITURE_DENSITY_BUCKETS = [
  /제품군\s*차이|라인업|모델별/,
  /체험\s*포인트|누워보|직접\s*체험/,
  /공간\s*배치|동선|방\s*크기/,
  /매트리스\s*구성|하드|소프트|쿠션감|체압/,
  /행사\s*대상|대상\s*모델|프로모션\s*대상/,
  /할인\s*조건|할인율|적용\s*조건|카드\s*혜택/,
  /증정품|사은품|증정/,
  /방문\s*포인트|매장\s*방문|체험\s*예약/,
  /예약\s*가능|사전\s*예약|상담\s*예약/,
  /설치\s*흐름|배송\s*일정|설치\s*일정/,
  /구매\s*고려\s*요소|예산|교환\s*조건|A\/S|보증/,
];
const REGION_DENSITY_BUCKETS = [
  /생활권|상권|인근\s*상권/,
  /방문\s*동선|이동\s*동선|주차|접근성/,
  /방문\s*이유|방문\s*목적|체험\s*목적/,
  /어떤\s*사람|많이\s*찾|비교\s*검토/,
];

function tokenizeTopic(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function countClicheOccurrences(text) {
  let n = 0;
  for (const p of CORE_AI_CLICHES) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

function topicKeywords(ctx = {}) {
  const anchor = ctx.topicAnchor || ctx.inputGrounding?.topicAnchor;
  if (anchor?.length) return [...new Set(anchor)];

  const raw = [
    ctx.inputGrounding?.primaryStory,
    ctx.topic,
    ctx.main,
    ctx.mainKeyword,
    ctx.writingSubject,
    ctx.contentThesis,
    ctx.representativeTitle,
    ...(ctx.inputGrounding?.mustInclude || []),
  ]
    .filter(Boolean)
    .join(" ");
  return [...new Set(tokenizeTopic(raw))];
}

/** Canonical brief alignment — must-include + industry drift */
export function scoreInputMismatch(pack, ctx = {}, channel = "blog") {
  const full =
    channel === "blog" ? getBlogFullText(pack) : getChannelFullText(pack, channel);
  const grounding = ctx.inputGrounding || {};
  const mustInclude = grounding.mustInclude || [];
  const briefIndustry = grounding.industryHint || detectBriefIndustry(ctx);
  const outputIndustry = detectOutputIndustry(full);

  let score = 10;
  const reasons = [];

  if (mustInclude.length) {
    const missing = mustInclude.filter((phrase) => {
      const bit = String(phrase).trim().slice(0, 12);
      return bit.length >= 4 && !full.includes(bit);
    });
    if (missing.length >= Math.ceil(mustInclude.length * 0.5)) {
      score -= 6;
      reasons.push("must_include_missing");
    } else if (missing.length > 0) {
      score -= 2;
    }
  }

  if (
    briefIndustry &&
    outputIndustry &&
    briefIndustry !== outputIndustry &&
    countIndustryMentions(full, outputIndustry) >= 2
  ) {
    score -= 5;
    reasons.push("industry_contradiction");
  }

  const ok = score >= 7 && !reasons.includes("industry_contradiction");
  return { score: Math.max(0, score), ok, reasons };
}

function detectBriefIndustry(ctx) {
  const blob = [
    ctx.inputGrounding?.primaryStory,
    ctx.canonicalBrief,
    ctx.topic,
    ctx.industryLabel,
    ctx.industryKey,
  ]
    .filter(Boolean)
    .join(" ");
  return industryKeyFromText(blob);
}

function detectOutputIndustry(full) {
  return industryKeyFromText(full);
}

const INDUSTRY_MARKERS = [
  { re: /꽃집|플라워|생화|꽃다발/, key: "flower" },
  { re: /카페|커피\s*숍|라떼|원두/, key: "cafe" },
  { re: /부동산|매물|전세|월세|중개/, key: "realestate" },
  { re: /병원|의원|진료|처방/, key: "hospital" },
  { re: /학원|입시|수능|과외/, key: "academy" },
  { re: /헬스|피트니스|운동\s*기구/, key: "gym" },
];

function industryKeyFromText(text) {
  const blob = String(text || "");
  for (const row of INDUSTRY_MARKERS) {
    if (row.re.test(blob)) return row.key;
  }
  return null;
}

function countIndustryMentions(full, key) {
  const row = INDUSTRY_MARKERS.find((r) => r.key === key);
  if (!row) return 0;
  const m = full.match(row.re);
  return m ? m.length : 0;
}

/** 주제 적합도 0–20 */
export function scoreTopicFit(pack, ctx = {}, channel = "blog") {
  const full =
    channel === "blog" ? getBlogFullText(pack) : getChannelFullText(pack, channel);
  const kws = topicKeywords(ctx);
  if (!kws.length) return { score: 18, ok: true };

  const hits = kws.filter((k) => full.includes(k)).length;
  const ratio = hits / kws.length;
  const score = Math.round(Math.min(20, ratio * 22));
  const ok = ratio >= 0.7 || (kws.length <= 2 && hits >= Math.min(kws.length, 1));
  return { score, ok, ratio, hits, total: kws.length };
}

/** 검색 의도 0–20 */
export function scoreSearchIntentBlock(pack, ctx = {}) {
  const raw = scoreSearchIntent(pack, ctx);
  const score = Math.round((raw / 100) * 20);
  return { score, ok: raw >= 50, raw };
}

/** 브랜드 반영 0–15 */
export function scoreBrandPresence(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const brand = ctx.brandName || "";
  const memory = ctx.brandMemory || {};
  const hasBrandContext =
    brand ||
    memory.brandDescription ||
    memory.storeFeatures ||
    ctx.brandDescription ||
    ctx.storeFeatures;

  if (!hasBrandContext) return { score: 12, ok: true };

  let score = 0;
  if (brand && full.includes(brand)) score += 8;
  const extras = [
    memory.brandDescription,
    memory.storeFeatures,
    ctx.includeList?.join?.(" ") || ctx.includePhrases,
  ].filter(Boolean);
  for (const e of extras) {
    const bit = String(e).slice(0, 8);
    if (bit.length >= 3 && full.includes(bit)) score += 4;
  }
  score = Math.min(15, score);
  const ok = !brand || (full.includes(brand) && score >= 8);
  return { score, ok };
}

/** 화자 일관성 0–10 */
export function detectPersonaInconsistency(pack, ctx = {}) {
  const full = getBlogFullText(pack).slice(0, 800);
  const official = OFFICIAL_OPENERS.filter((re) => re.test(full)).length;
  const review = REVIEW_OPENERS.filter((re) => re.test(full)).length;
  const ad = AD_OPENERS.filter((re) => re.test(full)).length;
  const speaker = ctx.input?.v4Speaker || "auto";
  if (speaker === "brand_intro" && review >= 2 && official === 0) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  if (speaker === "plain_review" && official >= 2) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  if (official >= 1 && review >= 2 && ad >= 1) {
    return { ok: false, reason: "persona_inconsistency" };
  }
  return { ok: true, reason: null };
}

export function scorePersonaConsistency(pack, ctx = {}) {
  const p = detectPersonaInconsistency(pack, ctx);
  return { score: p.ok ? 10 : 3, ok: p.ok, reason: p.reason };
}

/** 말투 일관성 0–10 */
export function scoreToneConsistency(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const key = ctx.speechStyle || ctx.input?.speechStyle || "friendly_blog";
  const mix = detectSpeechStyleMixing(full, key);
  return { score: mix.ok ? 10 : 2, ok: mix.ok, reason: mix.ok ? null : "tone_inconsistency" };
}

/** 감정 온도 0–10 */
export function scoreEmotionConsistency(pack, ctx = {}) {
  const clicheN = countClicheOccurrences(getBlogFullText(pack));
  const emotion = resolveEmotionTemperature(ctx.input || ctx);
  let score = 10;
  if (emotion.key === "plain" && clicheN >= 3) score -= 4;
  if (emotion.key === "premium" && /ㅋ|ㅎ|대박/.test(getBlogFullText(pack))) score -= 3;
  return { score: Math.max(0, score), ok: score >= 6 };
}

export function detectPlaceholder(full) {
  return CORE_PLACEHOLDER_RE.test(full);
}

export function detectFakeLocation(full, ctx = {}) {
  const region = String(ctx.region || "").trim();
  if (region.length >= 2) return { ok: true, hits: [] };
  const hits = FAKE_LOCATION_MARKERS.filter((loc) => full.includes(loc));
  return { ok: hits.length === 0, hits };
}

export function scoreCoreContent(pack, ctx = {}, channel = "blog") {
  const full = channel === "blog" ? getBlogFullText(pack) : fullFromChannel(pack, channel);
  const failReasons = [];
  const breakdown = {};

  if (detectPlaceholder(full)) {
    failReasons.push("placeholder_detected");
    breakdown.placeholder = 0;
  } else {
    breakdown.placeholder = 5;
  }

  const clicheN = countClicheOccurrences(full);
  if (clicheN >= 2) {
    failReasons.push("ai_cliche_detected");
    breakdown.aiCliche = 0;
  } else {
    breakdown.aiCliche = Math.max(0, 5 - clicheN);
  }

  if (hasDuplicateSentences(full, 14)) {
    failReasons.push("repetition_detected");
    breakdown.repetition = 0;
  } else {
    breakdown.repetition = 5;
  }

  if (channel === "blog" || channel === "place" || channel === "instagram") {
    const outline = detectOutlineLeak(pack, channel);
    if (outline.isOutline) {
      failReasons.push("outline_only_output");
      breakdown.publishableBody = 0;
    } else {
      breakdown.publishableBody = 10;
    }
  }

  const topic = scoreTopicFit(pack, ctx, channel);
  breakdown.topicFit = topic.score;
  if (!topic.ok) failReasons.push("topic_drift");

  const inputAlign = scoreInputMismatch(pack, ctx, channel);
  breakdown.inputAlignment = inputAlign.score;
  if (!inputAlign.ok) failReasons.push("input_mismatch");

  const dominance = scoreInputTopicDominance(full, { ...ctx, input: ctx.input || ctx }, channel);
  breakdown.topicDominance = Math.round((dominance.ratio || 0) * 10);
  if (!dominance.ok) failReasons.push("topic_dominance_low");

  if (hasMetaPhilosophyLeak(full, ctx)) {
    failReasons.push("meta_philosophy_leak");
    breakdown.philosophyLeak = 0;
  } else {
    breakdown.philosophyLeak = 10;
  }

  const repetition = detectExcessiveRepetition(full);
  breakdown.repetition = repetition.ok ? 10 : 4;
  if (!repetition.ok) failReasons.push("excessive_repetition");

  if (channel === "blog") {
    const industry = scoreIndustryDensity(full, { ...ctx, input: ctx.input || ctx });
    breakdown.industryDensity = industry.ok ? 10 : 5;
    if (!industry.ok) failReasons.push("industry_density_low");

    const region = scoreRegionDensity(full, { ...ctx, input: ctx.input || ctx });
    breakdown.regionDensity = region.ok || region.skipped ? 10 : 5;
    if (!region.ok && !region.skipped) failReasons.push("region_density_low");

    const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
    if (brand) {
      const brandRe = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const brandCount = (full.match(brandRe) || []).length;
      breakdown.brandReflection = brandCount >= 3 ? 10 : 5;
      if (brandCount < 3) failReasons.push("brand_under_reflected");
    }
  }

  const search = scoreSearchIntentBlock(pack, ctx);
  breakdown.searchIntent = search.score;
  if (!search.ok) failReasons.push("search_intent_missing");

  if (channel === "blog") {
    const customerQ = evaluateCustomerQuestionDelivery(pack, ctx);
    breakdown.customerQuestions = Math.round((customerQ.coverage / 6) * 10);
    for (const r of customerQ.reasons || []) failReasons.push(r);
  }

  const toneRaw = String(ctx.input?.tone || ctx.tone?.value || "").toLowerCase();
  const objectiveRaw = String(
    ctx.input?.contentObjective || ctx.contentObjective || ctx.input?.purpose || ""
  ).toLowerCase();
  const industryRaw = String(
    ctx.input?.industry || ctx.industryLabel || ctx.industryKey || ""
  ).toLowerCase();
  const isBusinessFirstContext =
    /saas|ai|academy|교육|마케팅|platform|플랫폼|서비스/.test(industryRaw) ||
    /brand|브랜드|info|정보/.test(objectiveRaw) ||
    /informative|trust|brand/.test(toneRaw);
  const businessBannedHits = CORE_BUSINESS_BANNED.filter((p) => full.includes(p));
  if (isBusinessFirstContext && businessBannedHits.length) {
    failReasons.push("business_tone_violation");
    breakdown.businessTone = 0;
  } else {
    breakdown.businessTone = 10;
  }

  const isBriclogArticle =
    String(ctx.brandName || "").includes("브릭로그") ||
    String(ctx.input?.brandName || "").includes("브릭로그") ||
    full.includes("브릭로그");
  if (isBriclogArticle) {
    const requiredHits = BRICLOG_REQUIRED_KEYWORDS.filter((k) => full.includes(k));
    breakdown.brandPhilosophyDepth = Math.min(
      10,
      Math.round((requiredHits.length / BRICLOG_REQUIRED_KEYWORDS.length) * 10)
    );
    if (requiredHits.length < 4) failReasons.push("briclog_philosophy_missing");
    const genericHits = BRICLOG_GENERIC_PATTERNS.filter((re) => re.test(full)).length;
    breakdown.briclogSpecificity = Math.max(0, 10 - genericHits * 2);
    if (genericHits >= 2) failReasons.push("briclog_generic_tone");
    const sloganHits = BRICLOG_SLOGAN_LINES.filter((re) => re.test(full)).length;
    breakdown.briclogNarrativeFlow = Math.max(0, 10 - sloganHits * 3);
    if (sloganHits >= 1) failReasons.push("briclog_slogan_injection");
  } else {
    breakdown.brandPhilosophyDepth = 10;
    breakdown.briclogSpecificity = 10;
    breakdown.briclogNarrativeFlow = 10;
  }

  const brand = scoreBrandPresence(pack, ctx);
  breakdown.brandPresence = brand.score;
  if (!brand.ok) failReasons.push("brand_presence_missing");

  const persona = scorePersonaConsistency(pack, ctx);
  breakdown.personaConsistency = persona.score;
  if (!persona.ok) failReasons.push(persona.reason || "persona_inconsistency");

  const tone = scoreToneConsistency(pack, ctx);
  breakdown.toneConsistency = tone.score;
  if (!tone.ok) failReasons.push(tone.reason || "tone_inconsistency");

  const emotion = scoreEmotionConsistency(pack, ctx);
  breakdown.emotionTone = emotion.score;

  const infoDensity = scoreInformationDensity(full, ctx, channel);
  breakdown.informationDensity = infoDensity.score;
  for (const r of infoDensity.reasons || []) failReasons.push(r);

  const infoYield = scoreInformationYield(full, { ...ctx, input: ctx.input || ctx }, channel);
  breakdown.informationYield = infoYield.score;
  if (!infoYield.ok && channel === "blog") {
    failReasons.push("information_yield_low");
  }

  const loc = detectFakeLocation(full, ctx);
  if (!loc.ok) failReasons.push("fake_location_inserted");

  let lengthScore = 5;
  if (channel === "blog") {
    const tier = resolveBlogLengthTier(
      ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium"
    );
    const chars = countBlogBodyCharsWithSpaces(pack);
    const humanDelivery = scoreHumanDeliveryHeuristics(pack, ctx);
    breakdown.humanDelivery = humanDelivery.score;
    for (const r of humanDelivery.reasons) {
      if (r === "length_tier_under" && !isLengthOnlyGateSoft()) {
        failReasons.push("length_too_short");
      } else if (r === "length_tier_over") failReasons.push("length_tier_over");
      else if (r === "filler_padding") failReasons.push("filler_padding");
      else if (r === "emotion_thin") failReasons.push("emotion_thin");
      else if (r === "ai_cliche_heavy") failReasons.push("ai_cliche_detected");
    }
    if (chars < tier.min && !isLengthOnlyGateSoft()) {
      failReasons.push("length_under_min");
    }
    if (chars > tier.max) failReasons.push("length_over_max");
    if (chars < tier.min) {
      lengthScore = Math.max(0, Math.round((chars / tier.min) * 5));
    } else if (chars > tier.max) {
      lengthScore = Math.max(
        2,
        5 - Math.min(3, Math.round((chars - tier.max) / 400))
      );
    } else {
      lengthScore = 5;
    }
  }
  breakdown.length = lengthScore;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const capped = Math.min(100, Math.round(total));

  return {
    total: capped,
    breakdown,
    failReasons: [...new Set(failReasons)],
    pass: capped >= getQualityTarget() && failReasons.length === 0,
    blockers: failReasons,
  };
}

function scoreInformationDensity(full, ctx = {}, channel = "blog") {
  if (channel !== "blog") return { score: 10, reasons: [] };
  const reasons = [];
  let score = 10;
  const industryRaw = String(
    ctx.input?.industry || ctx.industryLabel || ctx.industryKey || ""
  ).toLowerCase();
  const regionRaw = String(ctx.input?.region || ctx.region || "").trim();
  const isFurniture =
    /가구|침대|매트리스|모션베드|furniture|bed|mattress/.test(industryRaw);
  if (isFurniture) {
    const hitBuckets = FURNITURE_DENSITY_BUCKETS.filter((re) => re.test(full)).length;
    if (hitBuckets < 4) {
      reasons.push("commerce_density_low");
      score -= 6;
    } else if (hitBuckets < 6) {
      score -= 3;
    }
  }
  if (regionRaw && !/^전국$/.test(regionRaw)) {
    const regionHits = REGION_DENSITY_BUCKETS.filter((re) => re.test(full)).length;
    if (regionHits < 2) {
      reasons.push("region_density_low");
      score -= 4;
    }
  }
  return { score: Math.max(0, score), reasons };
}

function fullFromChannel(pack, channel) {
  if (channel === "blog") return getBlogFullText(pack);
  return [
    pack?.title,
    pack?.shortNotice,
    pack?.detailBody,
    pack?.hook,
    pack?.body,
    pack?.lineBreakBody,
    pack?.ending,
  ]
    .filter(Boolean)
    .join("\n");
}

const REGEN_HINTS = {
  placeholder_detected:
    "placeholder·미완성 라벨(좋은내용, 브랜드명, 제목, undefined 등)을 실제 문장으로 바꿔 주세요.",
  ai_cliche_detected:
    "AI 관용구(특별한 경험, 소중한 순간, 감동을 선사 등)를 줄이고 구체 장면으로 써 주세요.",
  repetition_detected: "같은 문장·같은 소제목 패턴 반복을 제거해 주세요.",
  topic_drift:
    "권위 브리프(핵심 이야기·브랜드)에서 벗어난 지역·업종·행사 이야기를 빼고 입력 주제에 70% 이상 답해 주세요.",
  input_mismatch:
    "권위 브리프의 핵심 이야기·반드시 반영 포인트·업종 맥락과 다른 내용은 제거하고 사용자가 의도한 주제만 써 주세요.",
  search_intent_missing:
    "검색한 사람이 궁금해할 질문(왜, 어떻게, 누구에게, 지금 해볼 만한지)에 답해 주세요.",
  brand_presence_missing:
    "브랜드명·매장 특징·서비스가 본문에 자연스럽게 드러나게 써 주세요.",
  persona_inconsistency:
    "선택한 화자 톤을 처음부터 끝까지 유지하세요. 공식 안내↔후기 톤 혼용 금지.",
  first_delivery_persona:
    "선택한 화자(에디터·후기·칼럼) 말투를 도입·본문·마무리에 일관되게 맞추세요.",
  persona_voice_weak:
    "화자 특유 표현(직접·체험·느낌·비교·이야기)을 본문에 더 담아 주세요.",
  persona_voice_forbidden:
    "광고·소개해 드립니다·브로슈어 문장을 빼고 화자 톤만 유지하세요.",
  persona_intro_cliche:
    "「안녕하세요」「오늘은」 없이 맥락·장면으로 도입하세요.",
  persona_narrative_arc:
    "왜→본문 경험→인상→독자 기준 순 서사를 한 번 더 맞추세요.",
  first_delivery_regen:
    "첫 편집본 기준에 맞게 화자·에디터 톤을 다듬는 중입니다.",
  tone_inconsistency:
    "선택한 말투(해요체/습니다체)를 제목·도입·본문·마무리 전 구간에 일관되게 유지하세요.",
  fake_location_inserted:
    "사용자가 지역을 입력하지 않았으면 서울·강남·파주 등 임의 지역명을 넣지 마세요.",
  length_too_short: (() => {
    const t = resolveBlogLengthTier("medium");
    return `선택한 분량 tier 최소 ${t.min}자(공백 포함)에 맞춰 보강하되, 빈 수식·반복으로 채우지 마세요.`;
  })(),
  length_under_min:
    "요청한 글자수 최소 기준 미달입니다. 반복 없이 운영 흐름·판단 근거·실행 단계를 보강해 min 이상으로 맞추세요.",
  length_tier_over:
    "선택한 분량 상한을 넘었습니다. 군더더기·반복 문단을 자르고 tier max 이내로 맞추세요.",
  filler_padding:
    "분량 맞추기용 일반론·「많은 분들이」·「참고하시기」 등 빈 문장을 제거하세요.",
  emotion_thin:
    "감정·공감이 느껴지도록 구체 장면·순간·몸의 반응을 한두 군데 넣으세요.",
  v2axis_brand_mentions:
    "브랜드명을 제목·소제목·본문에 자연스럽게 5회 이상 (키워드 도배 금지).",
  v2axis_region_mentions:
    "지역명을 5회 이상 반영하고 지역 검색 의도(매장·생활권)에 답하세요.",
  v2axis_product_mentions:
    "제품·주제 키워드를 5회 이상, 확인된 특징·차별점 위주로 쓰세요.",
  v2axis_seo_weak:
    "제목·첫 문단·소제목·마무리에 브랜드·지역·주제를 각각 배치하세요.",
  v2axis_banned_template:
    "꽃집·카페·기념일 등 이전 업종 템플릿 문구를 모두 제거하세요.",
  v2axis_below_95:
    "브랜드·지역·주제 축과 SEO·팩트 검수 95점 이상이 되도록 보강하세요.",
  v2axis_no_research:
    "조사·검증 없이 작성하지 마세요. 【조사 확정 항목】만 근거로 다시 작성하세요.",
  v2axis_insufficient_facts:
    "확인된 실마리만 단정하고, 부족한 부분은 브랜드·지역·독자 질문으로 전개하세요.",
  v2axis_low_research_grounding:
    "본문 70% 이상을 【조사 확정 항목】에 근거해 다시 쓰세요. 일반론·추측 문장 제거.",
  v2axis_off_axis_sentences:
    "브랜드·지역·주제와 무관한 문장·타 업종 템플릿을 삭제하고 조사 항목만 반영하세요.",
  v3_below_95: "V3 브랜드 점수 95점 이상 — 브랜드·지역·주제·정보성·SEO·신뢰성.",
  v3_reader_memory_fail:
    "독자가 브랜드·지역·제품을 기억하도록 제목·본문·마무리에 세 축을 분명히.",
  v3_industry_drift: "기념일·꽃·카페·반려견 등 업종 무관 문장 제거.",
  v3_ai_contamination: "혁신·최고·감동·주말 아침 등 AI 오염 표현 제거.",
  v3_fact_check_fail: "브랜드명·지역명·제품명 일치 및 허구 표현을 수정하세요.",
  business_tone_violation:
    "SaaS/AI/academy/마케팅 글에서 감성 템플릿(햇살·커피·설렘·새로운 세계 등)을 제거하고 문제·운영 흐름 중심으로 재작성하세요.",
  briclog_philosophy_missing:
    "브릭로그 글은 브랜드 기억·브랜드 메모리·콘텐츠 축적·브랜드 일관성·브랜드 맥락·SEO는 결과를 자연스럽게 포함하세요.",
  business_emotion_cliche:
    "SaaS/AI/플랫폼/academy/마케팅 글에서 감성 카피(봄날·커피·설렘·새로운 시작)를 제거하세요.",
  seasonal_drift:
    "시즌 목적이 아닌 글에 계절 서사(봄/여름휴가/가을감성/연말분위기)가 섞였습니다. 운영 맥락 중심으로 다시 작성하세요.",
  intent_contract_must_include_missing:
    "사용자 의도 계약의 필수 반영 포인트가 본문에 부족합니다. 핵심 키워드를 문맥 속에 자연 반영하세요.",
  intent_contract_flow_missing:
    "사용자 의도 계약의 흐름 키워드(문제·원인·기준·실행·검수)가 충분히 반영되지 않았습니다.",
  intent_contract_generic_phrase:
    "사용자 의도 계약에서 금지한 범용 소개 문장이 포함되었습니다. 업종/목적 맥락으로 재작성하세요.",
  briclog_ai_limit_missing:
    "브릭로그 글에는 기존 AI 글의 한계(브랜드 톤 흔들림)를 명시하세요.",
  briclog_consistency_missing:
    "브랜드 방향성·브랜드 말투 유지·반복의 중요성을 운영 관점으로 설명하세요.",
  briclog_generic_tone:
    "브릭로그 글이 범용 블로그툴 소개 톤으로 작성되었습니다. 브랜드 메모리·일관성·운영 철학 중심으로 재작성하세요.",
  briclog_slogan_injection:
    "브릭로그 핵심 문장을 단독 슬로건처럼 끼워 넣지 말고, 문단 맥락 속 설명으로 재서술하세요.",
  commerce_density_low:
    "가구/침대 글은 구매 판단 정보 밀도가 부족합니다. 제품군 차이·체험 포인트·행사 대상 모델·할인 조건·설치 흐름·구매 고려 요소를 구체적으로 보강하세요.",
  region_density_low:
    "지역 밀도가 약합니다. 생활권·방문 동선·인근 상권·방문 이유·체험 목적 중 최소 2개 이상을 자연스럽게 포함하세요.",
  length_over_max:
    "요청 길이 상한(공백 포함)을 넘었습니다. 반복·군더더기 문장을 정리해 max 이내로 맞추세요.",
  purpose_not_satisfied:
    "사용자 설정 목적을 충족하지 못했습니다. 목적(브랜드 소개/정보/홍보)에 맞는 구성으로 재작성하세요.",
  outline_only_output:
    "구성안·체크리스트·PLAN 소제목이 아닌, 네이버에 바로 붙여넣을 완성 본문(문단)으로 다시 작성하세요. 「이 주제가 필요한 실제 상황 정리」 등 구성안 문장·소제목 금지. 브랜드·지역·주제·프로모션·체험·방문·구매 내용이 90% 이상이어야 합니다.",
  topic_dominance_low:
    "본문 80% 이상을 사용자 입력 주제·브랜드·지역·업종 관련 실무 정보로 채우세요. 브릭로그 철학·운영·검수 설명 문장을 제거하세요.",
  customer_questions_missing:
    "검색자 질문(왜·누가·언제·비교·자주 묻는 질문·구매 전 실수) 6가지 중 최소 4가지에 본문으로 답하세요.",
  topic_description_only:
    "주제 설명·정의형 서두만 있고 고객 질문에 답하지 않았습니다. 검색 이유와 선택·방문·구매 판단에 필요한 답을 쓰세요.",
  meta_philosophy_leak:
    "브랜드 메모리·콘텐츠 일관성·운영 관점·검수 기준·브랜드 철학 설명을 본문에서 삭제하세요. 철학은 문체·구조에만 반영하고 주제 정보(제품·행사·방문·혜택)로 대체하세요.",
  naver_voice_low:
    "네이버 상위글처럼 해요체·1인칭·「솔직히」「다녀왔어요」「직접」을 도입·본문에 자연스럽게 넣으세요. FAQ·나열 금지.",
  naver_avoid_phrase:
    "「확인하세요」「권합니다」「방문·예약 안내」「체험 전 알아둘 것」 등 안내 문서체를 제거하고 경험·칼럼 흐름으로 바꾸세요.",
  checklist_voice:
    "체크리스트·「확인하세요」 나열이 아닌, 문제→이유→비교→정리 칼럼 한 편으로 다시 쓰세요.",
  josa_error:
    "제목·본문 조사(를/을)를 한국어 맞춤법에 맞게 고치세요.",
  human_belief_low:
    "광고·브로슈어 톤을 빼고, 직접 경험·현장 smell(솔직·다녀·고민·불편)을 도입·본문에 넣으세요.",
  field_smell_low:
    "「직접 방문」「솔직히」「다녀왔어요」 등 현장·경험 표현을 2회 이상 자연스럽게 넣으세요.",
};

export function buildRegenPromptForFailures(failReasons = [], ctx = {}) {
  const tier = resolveBlogLengthTier(
    ctx.blogLengthTier || ctx.input?.blogLengthTier || "medium"
  );
  const lines = failReasons
    .map((r) => {
      if (r === "length_too_short" || r === "length_tier_under" || r === "length_under_min") {
        return `선택한 분량 tier ${tier.min}~${tier.max}자(공백 포함)에 맞춰 보강하되, 빈 수식·반복으로 채우지 마세요.`;
      }
      return REGEN_HINTS[r];
    })
    .filter(Boolean);
  const speaker = V4_SPEAKER_OPTIONS.find((o) => o.value === ctx.v4Speaker);
  const style = SPEECH_STYLE_OPTIONS.find(
    (o) => o.value === (ctx.speechStyle || "friendly_blog")
  );
  if (speaker?.label) lines.unshift(`화자 유지: ${speaker.label}`);
  if (style?.label) lines.unshift(`말투 유지: ${style.label}`);
  return lines.join(" ");
}

export function needsCoreRegen(coreResult) {
  if (!coreResult) return false;
  return (
    coreResult.total < getQualityTarget() || coreResult.failReasons?.length > 0
  );
}

export function buildImprovementSuggestions(failReasons = []) {
  return failReasons.map((r) => REGEN_HINTS[r]).filter(Boolean);
}

export function labelsForMeta(input = {}) {
  const speaker = V4_SPEAKER_OPTIONS.find((o) => o.value === input.v4Speaker);
  const style = resolveSpeechStyle(input);
  const emotion = resolveEmotionTemperature(input);
  const profMap = {
    beginner: "초보 블로거",
    general: "일반 블로거",
    marketer: "마케터",
    editor_pro: "전문 에디터",
    writer_pro: "전문 작가",
  };
  return {
    persona: speaker?.label || "자동추천",
    emotionTone: emotion.label || "자동추천",
    writingTone: style.label,
    skillLevel: profMap[input.proficiency] || "전문 에디터",
  };
}
