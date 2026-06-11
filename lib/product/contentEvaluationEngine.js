/**
 * BRICLOG CONTENT EVALUATION ENGINE — 글 평가기 SSOT (생성기 아님)
 *
 * 100점 만점 · 90점 미만 출력 금지
 * 1. 검색 의도 20  2. 업종 적합 20  3. 브랜드 15
 * 4. 정보 밀도 15  5. 사람 문체 10  6. 반복 제거 10  7. Placeholder 10
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { shieldUtilizeGuidePhrase } from "@/lib/content/placeholderContaminationEngine";
import {
  countPlaceholderContamination,
  detectPlaceholderContamination,
} from "@/lib/content/placeholderContaminationEngine";
import { detectIndustryContamination } from "@/lib/product/industryContaminationEngine";
import { detectIntrusionPhrasesForIndustry } from "@/lib/pipeline/v2/industryLock";
import { assertTopicAnswerPostWrite } from "@/lib/product/topicAnswerEngine";
import { assessBrandFactPresence } from "@/lib/product/briclogResetQualityGate";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { resolveLockedIndustryKey } from "@/lib/product/industryContaminationEngine";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import {
  assessExplainQuality,
  assessV3ContentQuality,
  isBriclogExplainV3Enforced,
} from "@/lib/product/briclogExplainEngine";
import {
  assessExperienceOpinionQuality,
  isBriclogExperienceOpinionEnforced,
} from "@/lib/product/briclogExperienceOpinionEngine";
import { assessFactFirstPack } from "@/lib/product/briclogFactFirstEngine";
import { isBriclogMasterRebuildEnforced } from "@/lib/config/masterRebuildFlags";
import { isBriclogAlwaysDeliverEnabled } from "@/lib/config/masterRebuildFlags";

export const CONTENT_EVAL_VERSION = "eval-v1";
export const CONTENT_EVAL_PASS_SCORE = 90;

export const CONTENT_EVAL_WEIGHTS = {
  searchIntent: 20,
  industryFit: 20,
  brandReflection: 15,
  informationDensity: 15,
  humanVoice: 10,
  repetition: 10,
  placeholder: 10,
};

const FLOWER_NAMES = [
  /장미/, /튤립/, /해바라기/, /백합/, /카네이션/, /수국/,
  /리시안셔스/, /안개꽃/, /거베라/, /국화/, /프리지아/, /라넌큘러스/,
];

const EMERGENCY_PLACEHOLDER_RES = [
  /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/,
  /좋은내용/,
  /전시\s*소식/,
  /이\s*구성/,
  /관련해서/,
  /조건\s*및\s*구성/,
  /중립적으로\s*정리/,
  /비교가\s*수월해요/,
];

function scoreBucket(max, ratio) {
  return Math.max(0, Math.min(max, Math.round(max * ratio)));
}

function assessIndustryFitnessContract(pack, input = {}) {
  const full = getBlogFullText(pack);
  const key = resolveLockedIndustryKey(input);
  const reasons = [];

  if (key === "flower" || key === "unmanned_flower") {
    const hits = FLOWER_NAMES.filter((re) => re.test(full)).length;
    if (hits < 3) reasons.push("industry_flower_names_missing");
  }
  if (key === "cafe" || key === "tea_cafe") {
    if (!/메뉴|브런치|원두|라떼|에스프레소|음료|디저트|분위기|인테리어|테라스|좌석/.test(full)) {
      reasons.push("industry_cafe_menu_or_mood_missing");
    }
  }
  if (key === "furniture") {
    if (!/체험|비교|쇼룸|누워|앉아|직접|시공|견적|매트리스|소파|모션/.test(full)) {
      reasons.push("industry_furniture_experience_missing");
    }
  }

  const intrusion = detectIntrusionPhrasesForIndustry(pack, input);
  if (!intrusion.ok) reasons.push("industry_intrusion_phrase");

  const cross = detectIndustryContamination(pack, input);
  if (!cross.ok) reasons.push("industry_contamination");

  return { ok: reasons.length === 0, reasons, lockedKey: key };
}

function assessEmergencyPlaceholders(full = "") {
  const shielded = shieldUtilizeGuidePhrase(full);
  const hits = EMERGENCY_PLACEHOLDER_RES.filter((re) => re.test(shielded)).map(
    (re) => re.source
  );
  return { ok: hits.length === 0, hits };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessContentEvaluation(pack, input = {}) {
  const full = getBlogFullText(pack);
  const ctx = { input, ...input };
  const breakdown = {};
  const hardReasons = [];

  const emergencyPh = assessEmergencyPlaceholders(full);
  const ph = detectPlaceholderContamination(pack, input);
  const phCounts = countPlaceholderContamination(full);
  if (!emergencyPh.ok || phCounts.total > 0) {
    hardReasons.push("placeholder_contamination");
    breakdown.placeholder = 0;
  } else {
    breakdown.placeholder = CONTENT_EVAL_WEIGHTS.placeholder;
  }

  const industry = assessIndustryFitnessContract(pack, input);
  if (!industry.ok) {
    hardReasons.push(...industry.reasons.filter((r) => !hardReasons.includes(r)));
    breakdown.industryFit = 0;
  } else {
    breakdown.industryFit = CONTENT_EVAL_WEIGHTS.industryFit;
  }

  const topicAnswer = assertTopicAnswerPostWrite(pack, input);
  const flowerTopic = /꽃|플라워|추천/.test(
    `${input.topic || ""} ${input.mainKeyword || ""} ${pack?.title || ""}`
  );
  let searchRatio = topicAnswer.ok && !topicAnswer.skipped ? 1 : 0.35;
  if (flowerTopic && industry.lockedKey?.includes("flower")) {
    const flowerHits = FLOWER_NAMES.filter((re) => re.test(full)).length;
    searchRatio = flowerHits >= 3 ? 1 : flowerHits / 3;
    if (flowerHits < 3) hardReasons.push("search_intent_flower_names_missing");
  }
  breakdown.searchIntent = scoreBucket(CONTENT_EVAL_WEIGHTS.searchIntent, searchRatio);
  if (searchRatio < 0.6 && !hardReasons.includes("search_intent_low")) {
    hardReasons.push("search_intent_low");
  }

  const brand = assessBrandFactPresence(pack, input);
  breakdown.brandReflection = scoreBucket(
    CONTENT_EVAL_WEIGHTS.brandReflection,
    brand.hits.length / Math.max(brand.required, 1)
  );
  if (!brand.ok) hardReasons.push("brand_fact_presence_low");

  const info = scoreInformationYield(full, ctx, "blog");
  breakdown.informationDensity = scoreBucket(
    CONTENT_EVAL_WEIGHTS.informationDensity,
    (info.score || 0) / 100
  );

  const checklist = scoreChecklistVoice(full, pack);
  const ai = detectAiWritingPatterns(pack, input);
  const voiceRatio =
    checklist.ok && ai.ok ? 1 : checklist.ok || ai.ok ? 0.55 : 0.2;
  breakdown.humanVoice = scoreBucket(CONTENT_EVAL_WEIGHTS.humanVoice, voiceRatio);

  const dup = hasDuplicateSentences(full, 16);
  breakdown.repetition = dup ? 0 : CONTENT_EVAL_WEIGHTS.repetition;
  if (dup) hardReasons.push("duplicate_content");

  let factFirst = null;
  if (isBriclogMasterRebuildEnforced()) {
    factFirst = assessFactFirstPack(pack, input);
    if (!factFirst.ok) hardReasons.push("unverified_claim");
  }

  let explainQuality = null;
  let experienceQuality = null;
  let v3Quality = null;
  if (isBriclogExperienceOpinionEnforced()) {
    experienceQuality = assessExperienceOpinionQuality(pack, input);
    if (experienceQuality.dryFacts > 0) hardReasons.push("dry_fact_sentence");
    if (!experienceQuality.ok) hardReasons.push("experience_opinion_low");
  }
  if (isBriclogExplainV3Enforced()) {
    explainQuality = assessExplainQuality(pack, input);
    v3Quality = assessV3ContentQuality(pack, input, {
      researchExplainRate: input.researchFirstDossier?.organized?.coveredCount ? 0.92 : 0.75,
    });
    if (explainQuality.hollow > 0 || explainQuality.keywordLeaks > 0) {
      hardReasons.push("explain_hollow_or_keyword");
    }
    if (!explainQuality.ok) hardReasons.push("explain_quality_low");
    breakdown.informationDensity = Math.min(
      breakdown.informationDensity ?? CONTENT_EVAL_WEIGHTS.informationDensity,
      scoreBucket(CONTENT_EVAL_WEIGHTS.informationDensity, explainQuality.rate)
    );
  }

  let total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const hardFail = hardReasons.some((r) =>
    /placeholder|industry_|search_intent_flower|explain_hollow|dry_fact|unverified_claim/.test(r)
  );
  if (hardFail) total = Math.min(total, 59);

  const pass = !hardFail && total >= CONTENT_EVAL_PASS_SCORE;

  return {
    version: CONTENT_EVAL_VERSION,
    score: total,
    pass,
    hardFail,
    shouldWithhold: isBriclogAlwaysDeliverEnabled() ? false : !pass,
    breakdown,
    weights: CONTENT_EVAL_WEIGHTS,
    hardReasons: [...new Set(hardReasons)],
    checks: {
      placeholder: ph,
      emergencyPlaceholder: emergencyPh,
      industry,
      brand,
      topicAnswer,
      informationYield: info,
      checklist,
      ai,
      duplicate: dup,
      explainQuality,
      experienceQuality,
      v3Quality,
      factFirst,
    },
    userMessage: !pass
      ? hardFail
        ? "미완성·업종에 맞지 않는 표현이 있어 출력하지 않았습니다."
        : `품질 평가 ${total}점 — 90점 기준에 미달해 출력하지 않았습니다.`
      : null,
  };
}

export function assertContentEvaluation(pack, input = {}) {
  const eval_ = assessContentEvaluation(pack, input);
  return {
    ok: eval_.pass,
    stage: "content_evaluation",
    score: eval_.score,
    reasons: eval_.hardReasons,
    shouldWithhold: eval_.shouldWithhold,
    evaluation: eval_,
  };
}

export function stampContentEvaluation(pack, input = {}) {
  const evaluation = assessContentEvaluation(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentEvaluation: evaluation,
      contentEvalScore: evaluation.score,
      contentEvalPass: evaluation.pass,
      evaluationFirst: true,
    },
  };
}

/** 평가 우선 모드 — 생성 성공보다 평가 통과가 송출 조건 */
export function shouldWithholdForEvaluation(pack, input = {}) {
  if (!isBriclogResetQualityEnforced()) return false;
  return assessContentEvaluation(pack, input).shouldWithhold;
}
