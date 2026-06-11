/**
 * BRICLOG Fact-First Engine — 근거 없는 인기·수요·선호 표현 금지
 * 모르면 생략. AI 추정 금지.
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { getBlogFullText } from "@/utils/qualityCheck";

export const FACT_FIRST_VERSION = "fact-first-v1";

/** 실제 데이터 없이 사용 금지 */
export const UNVERIFIED_CLAIM_BAN_RES = [
  /문의가\s*많/,
  /인기가\s*많/,
  /많이\s*찾(?:는|습)/,
  /많이\s*선택(?:하는|하는\s*편|하는\s*경우)/,
  /선택하는\s*편(?:입니다|이에요|이다)/,
  /판매가\s*많/,
  /선호도가\s*높/,
  /수요가\s*(?:많|늘|높)/,
  /자주\s*고르(?:는|는)\s*편/,
  /선호(?:하는|하는)\s*편/,
  /잦(?:은|습니다|아요)\s*편/,
  /늘어나는\s*편(?:입니다|이에요)?/,
];

/** 조사 fact·구체 스펙이 있으면 허용 */
const VERIFIED_FACT_MARKERS = [
  /\d+\s*(?:만원|원|%|개|종|가지)/,
  /24\s*시간|무인|키오스크|픽업|쇼룸|전시|모델|좌판|등받이|STRESSLESS|메뉴|원두/,
  /(?:직원|매장|현장|쇼룸).{0,12}(?:안내|확인|전시)/,
  /research_fact|verified|공식|홈페이지|네이버\s*플레이스/i,
];

function hasVerifiedFactAnchor(sentence = "") {
  return VERIFIED_FACT_MARKERS.some((re) => re.test(sentence));
}

export function isUnverifiedClaimSentence(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 8) return false;
  if (!UNVERIFIED_CLAIM_BAN_RES.some((re) => re.test(t))) return false;
  return !hasVerifiedFactAnchor(t);
}

function stripUnverifiedFromText(text = "") {
  const sentences = splitKoreanSentences(text);
  if (!sentences.length) return text;
  const kept = sentences.filter((s) => !isUnverifiedClaimSentence(s));
  return kept.join(" ").trim();
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function stripUnverifiedClaimsFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let removed = 0;

  const sections = (pack.sections || []).map((sec) => {
    const before = String(sec.body || "");
    const after = stripUnverifiedFromText(before);
    if (after.length < before.length) removed += 1;
    return { ...sec, body: after || before };
  });

  let conclusion = pack.conclusion;
  if (conclusion) {
    const before = String(conclusion);
    conclusion = stripUnverifiedFromText(before) || before;
  }

  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      factFirstEngine: {
        version: FACT_FIRST_VERSION,
        stripped: removed > 0,
        sectionsTouched: removed,
      },
    },
  };
}

export function assessFactFirstPack(pack, input = {}) {
  const full = getBlogFullText(pack);
  const sentences = splitKoreanSentences(full);
  const violations = sentences.filter((s) => isUnverifiedClaimSentence(s));
  return {
    ok: violations.length === 0,
    version: FACT_FIRST_VERSION,
    violations: violations.slice(0, 8),
    count: violations.length,
  };
}
