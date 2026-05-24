/**
 * STEP 11 — Final Quality Score (90점 미만 출력 금지)
 */
import { evaluateWritingConstitution } from "@/lib/constitution/writingConstitution";
import { evaluateWritingConstitutionV2 } from "@/lib/constitution/writingConstitutionV2";
import {
  CONSTITUTION_V2_TARGET_SCORE,
  CONSTITUTION_V2_SOFT_PASS,
} from "@/lib/constitution/constitutionThresholds";
import { evaluateContentQualityRoot } from "@/lib/quality/contentQualityRoot";
import { evaluateHumanTemperature } from "@/lib/content/humanTemperature";
import { runHardValidation } from "./hardValidation";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBrandMentions } from "@/lib/constitution/writingConstitution";

/** LLM 초안 — 과도한 미출력 방지 (완성본은 사용자 검수 전제) */
const PASS_THRESHOLD = CONSTITUTION_V2_SOFT_PASS;
export const REGEN_THRESHOLD = CONSTITUTION_V2_TARGET_SCORE;

export function computeFinalQualityScore(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const constitution = evaluateWritingConstitution(pack, ctx, "blog");
  const constitutionV2 = evaluateWritingConstitutionV2(pack, ctx, "blog");
  const root = evaluateContentQualityRoot(pack, ctx, "blog");
  const hard = runHardValidation(pack, ctx);
  const human = evaluateHumanTemperature(full, "blog");

  const brandCount = countBrandMentions(full, ctx.brandName);
  const brandContextCount = ctx.pipeline?.brandContext?.count || 0;

  const dimensions = {
    brandFit: scoreBrandFit(ctx, brandCount, brandContextCount, constitution),
    personaFit: root.checks?.personaConsistent ? 95 : 55,
    industryFit: hard.industry?.ok !== false ? 92 : 40,
    humanLike: human.ok ? 90 : 58,
    readingFlow: scoreFlow(pack, constitution),
    visitPull: constitution.checks?.why ? 88 : 52,
    emotionTemp: constitution.checks?.emotion ? 90 : 50,
  };

  const weights = {
    brandFit: 0.18,
    personaFit: 0.14,
    industryFit: 0.14,
    humanLike: 0.16,
    readingFlow: 0.14,
    visitPull: 0.12,
    emotionTemp: 0.12,
  };

  let total = 0;
  const breakdown = [];
  for (const [key, weight] of Object.entries(weights)) {
    const s = dimensions[key];
    total += s * weight;
    breakdown.push({ key, label: dimensionLabel(key), score: Math.round(s), weight });
  }

  total = Math.round(total);
  if (!hard.ok) total = Math.min(total, 72);
  if (!root.ok) total = Math.min(total, 78);
  if (!constitution.ok) total = Math.min(total, 82);
  if (!constitutionV2.ok) total = Math.min(total, 84);
  const needsRegen = total < REGEN_THRESHOLD;

  return {
    total,
    pass: total >= PASS_THRESHOLD && hard.ok && root.ok,
    needsRegen,
    regenThreshold: REGEN_THRESHOLD,
    threshold: PASS_THRESHOLD,
    dimensions,
    breakdown,
    constitution,
    constitutionV2,
    root,
    hard,
  };
}

function dimensionLabel(key) {
  const map = {
    brandFit: "브랜드 적합도",
    personaFit: "화자 적합도",
    industryFit: "업종 적합도",
    humanLike: "사람스러움",
    readingFlow: "읽기 흐름",
    visitPull: "방문 유도력",
    emotionTemp: "감정 온도",
  };
  return map[key] || key;
}

function scoreBrandFit(ctx, mentions, contextCount, constitution) {
  if (!ctx.brandName) return contextCount >= 2 ? 85 : 80;
  if (mentions >= 3) return 94;
  if (mentions >= 1 && constitution.checks?.brand) return 82;
  return 58;
}

function scoreFlow(pack, constitution) {
  const sections = pack?.sections || [];
  if (sections.length < 3) return 50;
  const banned = sections.some((s) => !s.body || s.body.length < 80);
  if (banned) return 55;
  if (constitution.checks?.sceneMoments && constitution.checks?.noForbiddenOpen) {
    return 92;
  }
  return 70;
}
