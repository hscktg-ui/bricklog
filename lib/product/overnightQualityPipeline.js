/**
 * BRICLOG Overnight Quality Pipeline — Research→Explain→Experience→Delete→Gate
 * 생성 후·송출 전 품질 안정화 SSOT (기능 확장 없음, 품질만)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { runResearchFirstPipeline } from "@/lib/product/briclogResearchFirstPipeline";
import { stampResearchFirstOnInput } from "@/lib/product/briclogResearchFirstPipeline";
import {
  assessExplainQuality,
  filterExplainDefectSentences,
  isBriclogExplainV3Enforced,
} from "@/lib/product/briclogExplainEngine";
import {
  assessExperienceOpinionQuality,
  filterExperienceOpinionDefects,
  isBriclogExperienceOpinionEnforced,
} from "@/lib/product/briclogExperienceOpinionEngine";
import { applyBriclogDeleteEngine, assessDeleteEngine } from "@/lib/product/briclogDeleteEngine";
import {
  stripContentGateViolationsFromPack,
  assessContentGate,
} from "@/lib/product/contentGateSystem";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { shieldUtilizeGuidePhrase } from "@/lib/content/placeholderContaminationEngine";
import { scoreRegionColumnNaturalize } from "@/lib/content/regionColumnNaturalizeEngine";

export const OVERNIGHT_PIPELINE_VERSION = "overnight-v1";

export const OVERNIGHT_PIPELINE_STEPS = [
  "research_dossier",
  "delete_engine",
  "explain_filter",
  "experience_filter",
  "content_gate_strip",
];

function filterExplainDefectsFromPack(pack, input = {}) {
  if (!isBriclogExplainV3Enforced() || !pack?.sections?.length) return pack;

  const sections = pack.sections.map((sec) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept = filterExplainDefectSentences(paras, input);
    return { ...sec, body: kept.join("\n\n") };
  });

  return { ...pack, sections };
}

function filterExperienceDefectsFromPack(pack, input = {}) {
  if (!isBriclogExperienceOpinionEnforced() || !pack?.sections?.length) return pack;

  const sections = pack.sections.map((sec) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept = filterExperienceOpinionDefects(paras, input);
    return { ...sec, body: kept.join("\n\n") };
  });

  return { ...pack, sections };
}

/**
 * Research First dossier를 input에 스탬프 (조사 없이 작성 금지 신호)
 */
export function ensureResearchFirstDossier(input = {}, opts = {}) {
  if (input.researchFirstDossier?.organized) return input;
  const dossier = runResearchFirstPipeline(input, opts);
  return stampResearchFirstOnInput(input, dossier);
}

/**
 * 블로그 pack 품질 패스 — finalize 직전 호출
 * @param {object} pack
 * @param {object} input
 * @param {object} [opts]
 */
export function runOvernightQualityPass(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;
  if (!isBriclogResetQualityEnforced() && !opts.force) return pack;

  const inbound = pack;
  let next = pack;

  const enrichedInput = ensureResearchFirstDossier(input, opts);

  next = applyBriclogDeleteEngine(next, enrichedInput);
  next = guardPackAgainstShrink(inbound, next, { stage: "deleteEngine" });

  next = filterExplainDefectsFromPack(next, enrichedInput);
  next = guardPackAgainstShrink(inbound, next, { stage: "explainFilter" });

  next = filterExperienceDefectsFromPack(next, enrichedInput);
  next = guardPackAgainstShrink(inbound, next, { stage: "experienceFilter" });

  next = stripContentGateViolationsFromPack(next, enrichedInput);
  next = guardPackAgainstShrink(inbound, next, { stage: "contentGateStrip" });

  const explain = assessExplainQuality(next, enrichedInput);
  const experience = isBriclogExperienceOpinionEnforced()
    ? assessExperienceOpinionQuality(next, enrichedInput)
    : { ok: true, rate: 1 };
  const delete_ = assessDeleteEngine(next, enrichedInput);
  const contentGate = assessContentGate(next, enrichedInput);

  const researchOk =
    enrichedInput.researchFirstDossier?.writable !== false &&
    (enrichedInput.researchFirstDossier?.organized?.coveredCount ?? 0) >= 2;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      overnightQualityPipeline: {
        version: OVERNIGHT_PIPELINE_VERSION,
        steps: OVERNIGHT_PIPELINE_STEPS,
        researchOk,
        explainOk: explain.ok,
        explainRate: explain.rate,
        experienceOk: experience.ok,
        experienceRate: experience.rate,
        deleteOk: delete_.ok,
        deleteRatio: delete_.ratio,
        contentGateOk: contentGate.ok,
        contentGateScore: contentGate.score,
      },
      researchFirstDossier: enrichedInput.researchFirstDossier,
    },
  };
}

/**
 * 야간 테스트 샘플 평가
 */
export function assessOvernightSampleQuality(pack, input = {}) {
  const full = shieldUtilizeGuidePhrase(getBlogFullText(pack));
  const placeholderHits = [
    /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/,
    /전시\s*소식/,
    /좋은내용/,
    /undefined|null/,
  ].filter((re) => re.test(full));

  const explain = assessExplainQuality(pack, input);
  const experience = assessExperienceOpinionQuality(pack, input);
  const delete_ = assessDeleteEngine(pack, input);
  const contentGate = assessContentGate(pack, input);
  const contentEval = assessContentEvaluation(pack, input);
  const research = input.researchFirstDossier || pack._meta?.researchFirstDossier;
  const hasResearch =
    (research?.organized?.coveredCount ?? 0) >= 2 ||
    (research?.checklist?.length ?? 0) >= 2;

  const brand = String(input.brandName || "").trim();
  const brandFeatures =
    (brand && full.includes(brand.slice(0, Math.min(4, brand.length)))) ||
    /무인|24\s*시간|만원|프랜차이즈|쇼룸|메뉴|브런치/.test(full);

  const checks = {
    noPlaceholder: placeholderHits.length === 0,
    hasResearch,
    hasExplain: explain.ok || explain.rate >= 0.75,
    hasExperience: experience.ok || experience.rate >= 0.7,
    noRepeat: delete_.deletable <= 2,
    brandFeatures,
    regionColumnOk: scoreRegionColumnNaturalize(getBlogFullText(pack), input).ok,
    humanReadable: contentEval.score >= 76 || contentEval.pass === true,
    score85Plus: contentEval.score >= 85,
  };

  const passCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passCount / Object.keys(checks).length) * 100);

  return {
    checks,
    score,
    pass:
      checks.noPlaceholder &&
      checks.humanReadable &&
      checks.regionColumnOk &&
      (contentEval.pass === true || contentEval.score >= 85),
    contentGateScore: contentGate.score,
    evalScore: contentEval.score,
    evalPass: contentEval.pass,
    explainRate: explain.rate,
    experienceRate: experience.rate,
  };
}
