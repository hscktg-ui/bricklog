/**
 * 업종별 엔진 분리 — 타업종 템플릿 혼입 차단·입력 잠금
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { resolveLockedIndustryKey } from "@/lib/product/industryContaminationEngine";
import {
  detectIntrusionPhrasesForIndustry,
  industryForbiddenPhrases,
} from "@/lib/pipeline/v2/industryLock";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

export const INDUSTRY_PIPELINE_VERSION = "industry-router-v1";

const INTRUSION_SENTENCE_RES = [
  /전시\s*소식/,
  /좋은내용/,
  /관련해서\s*를\s*보면/,
  /알레르기\s*성분/,
  /원재료\s*표시/,
  /건조\s*공정/,
  /급여\s*방법/,
  /전시\s*관련\s*조건/,
];

function sentenceHasIntrusion(sentence = "", extraPatterns = []) {
  const t = String(sentence || "");
  if (!t.trim()) return false;
  const all = [...INTRUSION_SENTENCE_RES, ...extraPatterns];
  return all.some((re) => re.test(t));
}

function dropIntrusionSentences(text = "", extraPatterns = []) {
  const parts = splitKoreanSentences(text);
  const kept = parts.filter((s) => !sentenceHasIntrusion(s, extraPatterns));
  return kept.join(" ").trim();
}

/** 생성 입력에 업종 키 고정 — 교차 업종 프롬프트 혼입 방지 */
export function lockIndustryOnInput(input = {}) {
  const lockedKey = resolveLockedIndustryKey(input);
  const forbidden = industryForbiddenPhrases(lockedKey);
  return {
    ...input,
    industryKey: lockedKey,
    _industryPipeline: {
      version: INDUSTRY_PIPELINE_VERSION,
      lockedKey,
      forbiddenPatternCount: forbidden.length,
    },
  };
}

/** 팩 본문에서 타업종·침입 문장 제거 */
export function sanitizePackForIndustry(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const lockedKey = resolveLockedIndustryKey(input);
  const intrusion = detectIntrusionPhrasesForIndustry(pack, input);
  const forbidden = industryForbiddenPhrases(lockedKey);
  const extraPatterns = forbidden
    .filter((p) => typeof p === "object" && p instanceof RegExp)
    .slice(0, 12);

  const sections = pack.sections.map((sec) => ({
    ...sec,
    heading: dropIntrusionSentences(sec.heading, extraPatterns),
    body: dropIntrusionSentences(sec.body, extraPatterns),
  }));

  return {
    ...pack,
    title: dropIntrusionSentences(pack.title, extraPatterns),
    representativeTitle: dropIntrusionSentences(pack.representativeTitle, extraPatterns),
    sections: sections.filter((s) => String(s.body || "").trim().length > 8),
    conclusion: pack.conclusion
      ? dropIntrusionSentences(pack.conclusion, extraPatterns)
      : pack.conclusion,
    _meta: {
      ...(pack._meta || {}),
      industryPipelineKey: lockedKey,
      industryIntrusionHits: intrusion.hits,
      industrySanitized: intrusion.hits.length > 0 || undefined,
    },
  };
}

/** 업종 라우터 — 입력 잠금 + 팩 정화 */
export function runIndustryPipelineSanitize(pack, input = {}) {
  const lockedInput = lockIndustryOnInput(input);
  return sanitizePackForIndustry(pack, lockedInput);
}
