/**
 * BRICLOG Content Engine V4 — 핵심 검수 (빠른 출력) + 백그라운드 심화 검수
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { evaluateHumanTemperature } from "@/lib/content/humanTemperature";
import { countBrandMentions } from "@/lib/constitution/writingConstitution";
import { countSceneMoments } from "@/lib/constitution/writingConstitution";
import { runHardValidation } from "@/lib/pipeline/v2/hardValidation";
import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { runFinalAudit } from "@/lib/ultimate/finalAudit";
import { hasTemplatePlaceholder, V4_PLACEHOLDER_RE } from "@/lib/quality/placeholderGuard";

export { V4_PLACEHOLDER_RE };
export const HUMANITY_MIN = 75;
export const SEARCH_INTENT_MIN = 50;

export const V4_AI_CLICHES = [
  "소중한 순간",
  "특별한 경험",
  "풍요롭게",
  "행복을 더하다",
  "마음을 전하다",
  "감동을 선사하다",
  "가치를 전달하다",
  "품격 있는",
  "최고의 선택",
  "완벽한 하루",
];

export const V4_SCENE_HINTS = [
  "퇴근길",
  "주말 아침",
  "비 오는 날",
  "집들이",
  "출근 전",
  "매장 앞",
  "문 앞",
  "선물",
  "픽업",
  "예약",
  "방문",
  "걸어",
  "들어서",
  "기다리",
  "포장",
];

const SEARCH_INTENT_SIGNALS = [
  { id: "location", re: /위치|어디|오시는|길찾|지도|역\s*근처/, weight: 12 },
  { id: "price", re: /가격|비용|얼마|할인|이벤트\s*가/, weight: 10 },
  { id: "hours", re: /운영|영업|시간|휴무|오픈/, weight: 10 },
  { id: "reserve", re: /예약|문의|전화|주문/, weight: 10 },
  { id: "parking", re: /주차/, weight: 8 },
  { id: "visit", re: /방문|가보|찾아|들러/, weight: 10 },
  { id: "why", re: /왜|이유|차별|다른\s*점|선택/, weight: 10 },
  { id: "how", re: /이용|방법|주문|픽업/, weight: 10 },
];

function countCliches(text) {
  let n = 0;
  for (const p of V4_AI_CLICHES) {
    if (text.includes(p)) n += 1;
  }
  return n;
}

function brandFeatureHits(text, ctx) {
  const parts = [
    ctx.brandName,
    ctx.storeFeatures,
    ctx.benefit,
    ctx.includeList?.join(" "),
    ctx.brandDescription,
  ]
    .filter(Boolean)
    .join(" ");
  const tokens = parts
    .split(/[,，·\s/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (!tokens.length) return ctx.brandName ? (text.includes(ctx.brandName) ? 1 : 0) : 1;
  return tokens.filter((t) => text.includes(t)).length;
}

export function scoreSearchIntent(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const topic = [ctx.topic, ctx.main, ctx.mainKeyword, ctx.representativeTitle]
    .filter(Boolean)
    .join(" ");
  let expected = 0;
  let matched = 0;
  for (const sig of SEARCH_INTENT_SIGNALS) {
    if (sig.re.test(topic)) {
      expected += sig.weight;
      if (sig.re.test(full)) matched += sig.weight;
    }
  }
  if (expected === 0) {
    const base =
      (ctx.region && full.includes(ctx.region) ? 25 : 0) +
      (ctx.brandName && full.includes(ctx.brandName) ? 25 : 0) +
      (full.length > 400 ? 30 : 0);
    return Math.min(100, base + 20);
  }
  const ratio = matched / expected;
  return Math.round(Math.min(100, 40 + ratio * 60));
}

export function scoreHumanity(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  let score = 100;
  const blockers = [];

  if (hasTemplatePlaceholder(full)) {
    score -= 35;
    blockers.push("placeholder");
  }
  const clicheN = countCliches(full);
  if (clicheN > 0) {
    score -= Math.min(25, clicheN * 8);
    blockers.push("ai_cliche");
  }
  if (hasDuplicateSentences(full, 12)) {
    score -= 12;
    blockers.push("duplicate");
  }
  const scenes = countSceneMoments(full);
  const sceneHint = V4_SCENE_HINTS.some((h) => full.includes(h));
  if (scenes < 1 && !sceneHint) {
    score -= 15;
    blockers.push("no_scene");
  }
  const featHits = brandFeatureHits(full, ctx);
  if (ctx.brandName && featHits < 1) {
    score -= 10;
    blockers.push("brand_feature");
  }
  const human = evaluateHumanTemperature(full, "blog");
  if (!human.ok) score -= Math.min(20, human.issues.length * 6);

  const charCount = countBlogBodyChars(pack);
  if (charCount < BLOG_MIN_BODY_CHARS) {
    score -= 20;
    blockers.push("length");
  }

  return {
    score: Math.max(0, Math.round(score)),
    blockers,
    scenes,
    clicheN,
    featHits,
  };
}

/** 핵심 검수 — 통과 시 즉시 출력 */
export function runV4CoreAudit(pack, ctx = {}) {
  const hard = runHardValidation(pack, ctx);
  const humanity = scoreHumanity(pack, ctx);
  const searchIntentScore = scoreSearchIntent(pack, ctx);

  const blockers = [...humanity.blockers];
  if (!hard.ok) blockers.push(...hard.failures);

  const ok =
    hard.ok &&
    humanity.score >= HUMANITY_MIN &&
    searchIntentScore >= SEARCH_INTENT_MIN &&
    !blockers.includes("placeholder");

  return {
    ok,
    humanityScore: humanity.score,
    searchIntentScore,
    blockers: [...new Set(blockers)],
    hard,
    humanity,
  };
}

/** 심화 검수 — 출력 후 메타·개선 제안용 */
export function runV4BackgroundAudit(pack, ctx = {}, input = {}) {
  const qualityScore = computeFinalQualityScore(pack, ctx);
  const finalAudit = runFinalAudit(pack, ctx, input);
  return {
    qualityScore,
    finalAudit,
    suggestions: finalAudit.blockers?.length
      ? finalAudit.blockers
      : qualityScore.pass
        ? []
        : ["quality_score"],
  };
}
