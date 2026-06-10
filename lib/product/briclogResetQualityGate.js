/**
 * BRICLOG RESET QUALITY GATE — 사람이 읽을 수 있는 글만 통과 (SSOT)
 *
 * 1. Placeholder — 발견 즉시 FAIL
 * 2. 업종 적합도 — 타업종 금칙어
 * 3. 검색 의도 — 제목·주제 대비 본문 답변
 * 4. 브랜드 존재감 — 특징·지역·차별점 최소 3
 * 5. 사람 글 판정 — AI 관용구·반복·기계 문장
 * 6. 90점 미만 — 사용자 노출 금지
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  detectPlaceholderContamination,
  countPlaceholderContamination,
} from "@/lib/content/placeholderContaminationEngine";
import { detectIndustryContamination } from "@/lib/product/industryContaminationEngine";
import { detectIntrusionPhrasesForIndustry } from "@/lib/pipeline/v2/industryLock";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { assessGoldenQualityGate, GOLDEN_PASS_SCORE } from "@/lib/golden/goldenQualityGate";
import { assertTopicAnswerPostWrite } from "@/lib/product/topicAnswerEngine";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

export const BRICLOG_RESET_GATE_VERSION = "reset-v1";
export const BRICLOG_RESET_PASS_SCORE = GOLDEN_PASS_SCORE;

const FLOWER_NAME_RES = [
  /장미/,
  /튤립/,
  /해바라기/,
  /백합/,
  /카네이션/,
  /수국/,
  /리시안셔스/,
  /안개꽃/,
  /거베라/,
  /국화/,
  /프리지아/,
  /라넌큘러스/,
  /아네모네/,
  /스위트피/,
  /드라이플라워/,
  /오렌지\s*빛/,
  /핑크\s*톤/,
];

const RECOMMENDATION_TOPIC_RE =
  /(?:추천|어떤\s*꽃|꽃\s*이름|여름\s*꽃|봄\s*꽃|가을\s*꽃|겨울\s*꽃|시즌\s*꽃)/;

function tokenizeBrandFacts(input = {}) {
  const blobs = [
    input.storeFeatures,
    input.brandDescription,
    input.includePhrases,
    input.brandMemory?.storeFeatures,
    input.brandMemory?.brandDescription,
    ...(collectMergedResearchFacts(input) || []).map((f) => f.fact || f.text || f),
  ]
    .filter(Boolean)
    .join(" · ");

  const tokens = new Set();
  const brand = String(input.brandName || "").trim();
  if (brand.length >= 2) tokens.add(brand);

  const region = String(input.region || "").trim();
  if (region.length >= 2 && region !== "전국") tokens.add(region);

  for (const part of blobs.split(/[,，·|/|\n]+/)) {
    const t = part.trim();
    if (t.length >= 2 && t.length <= 24) tokens.add(t);
  }

  for (const m of blobs.match(/\d+\s*시간|무인|만원|배송|주차|예약|포장|24시간/gi) || []) {
    tokens.add(m.trim());
  }

  return [...tokens];
}

/** 브랜드·매장 차별점 본문 반영 — 최소 3 */
export function assessBrandFactPresence(pack, input = {}) {
  const full = getBlogFullText(pack);
  const tokens = tokenizeBrandFacts(input);
  const hits = tokens.filter((t) => full.includes(t));
  const min = Math.min(3, Math.max(1, tokens.length));
  return {
    ok: hits.length >= min,
    hits,
    required: min,
    available: tokens.length,
    score: Math.min(100, Math.round((hits.length / Math.max(min, 1)) * 100)),
  };
}

/** 꽃 추천·이름 주제 — 구체 꽃명 최소 3 */
export function assessSearchIntentContract(pack, input = {}) {
  const full = getBlogFullText(pack);
  const topic = `${input.topic || ""} ${input.mainKeyword || ""} ${pack?.title || ""}`;
  const reasons = [];

  if (RECOMMENDATION_TOPIC_RE.test(topic) && /꽃|플라워|flower/i.test(`${input.industry || ""} ${topic}`)) {
    const flowerHits = FLOWER_NAME_RES.filter((re) => re.test(full));
    if (flowerHits.length < 3) {
      reasons.push("search_intent_flower_names_missing");
    }
  }

  const topicAnswer = assertTopicAnswerPostWrite(pack, input);
  if (!topicAnswer.ok && !topicAnswer.skipped) {
    for (const r of topicAnswer.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    flowerNameCount: FLOWER_NAME_RES.filter((re) => re.test(full)).length,
  };
}

/** 사람 글 판정 — AI·체크리스트·중복 */
export function assessHumanReadableVoice(pack, input = {}) {
  const full = getBlogFullText(pack);
  const ai = detectAiWritingPatterns(pack, input);
  const checklist = scoreChecklistVoice(full, pack);
  const duplicate = hasDuplicateSentences(full, 16);
  const reasons = [];
  if (!ai.ok) reasons.push("ai_pattern_detected");
  if (!checklist.ok) reasons.push(...(checklist.issues || []).slice(0, 3));
  if (duplicate) reasons.push("duplicate_content");
  return {
    ok: reasons.length === 0,
    reasons,
    aiScore: ai.score,
    checklistScore: checklist.score,
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessBriclogResetQualityGate(pack, input = {}) {
  if (!isBriclogResetQualityEnforced()) {
    return {
      version: BRICLOG_RESET_GATE_VERSION,
      enforced: false,
      ok: true,
      score: 100,
      shouldWithhold: false,
      hardFail: false,
      reasons: [],
    };
  }

  const placeholder = detectPlaceholderContamination(pack, input);
  const placeholderCounts = countPlaceholderContamination(
    typeof pack === "string" ? pack : getBlogFullText(pack)
  );
  const industry = detectIndustryContamination(pack, input);
  const intrusion = detectIntrusionPhrasesForIndustry(pack, input);
  const brandFacts = assessBrandFactPresence(pack, input);
  const searchIntent = assessSearchIntentContract(pack, input);
  const humanVoice = assessHumanReadableVoice(pack, input);
  const golden = assessGoldenQualityGate(pack, input);

  const hardReasons = [];
  if (!placeholder.ok || placeholderCounts.total > 0) {
    hardReasons.push("placeholder_contamination");
  }
  if (!industry.ok) hardReasons.push("industry_contamination");
  if (!intrusion.ok) hardReasons.push("industry_intrusion_phrase");
  if (!searchIntent.ok) {
    hardReasons.push(...searchIntent.reasons.filter((r) => !hardReasons.includes(r)));
  }

  const softReasons = [];
  if (!brandFacts.ok) softReasons.push("brand_fact_presence_low");
  if (!humanVoice.ok) softReasons.push(...humanVoice.reasons.filter((r) => !softReasons.includes(r)));
  if (golden.score < BRICLOG_RESET_PASS_SCORE) softReasons.push("reset_score_below_90");
  if (golden.shouldBlock) softReasons.push("golden_gate_fail");

  const hardFail = hardReasons.length > 0;
  let score = golden.score;
  if (hardFail) score = Math.min(score, 59);
  if (!brandFacts.ok) score = Math.min(score, score - 8);
  if (!humanVoice.ok) score = Math.min(score, score - 10);

  const shouldWithhold = hardFail || score < BRICLOG_RESET_PASS_SCORE;
  const reasons = [...new Set([...hardReasons, ...softReasons])];

  return {
    version: BRICLOG_RESET_GATE_VERSION,
    enforced: true,
    ok: !shouldWithhold,
    score,
    goldenScore: golden.score,
    shouldWithhold,
    hardFail,
    reasons,
    checks: {
      placeholder,
      placeholderCounts,
      industry,
      intrusion,
      brandFacts,
      searchIntent,
      humanVoice,
      golden,
    },
    userMessage: shouldWithhold
      ? hardFail
        ? "미완성·업종에 맞지 않는 표현이 있어 화면에 올리지 않았어요."
        : "사람이 읽을 수 있는 편집본 기준(90점)에 닿지 않았어요."
      : null,
  };
}

export function assertBriclogResetQualityGate(pack, input = {}) {
  const gate = assessBriclogResetQualityGate(pack, input);
  return {
    ok: gate.ok,
    stage: "briclog_reset_quality",
    reasons: gate.reasons,
    score: gate.score,
    shouldWithhold: gate.shouldWithhold,
    hardFail: gate.hardFail,
    userMessage: gate.userMessage,
    gate,
  };
}

export function stampBriclogResetQualityGate(pack, input = {}) {
  const gate = assessBriclogResetQualityGate(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      resetQualityGate: gate,
      resetQualityScore: gate.score,
      resetQualityWithheld: gate.shouldWithhold || undefined,
    },
  };
}
