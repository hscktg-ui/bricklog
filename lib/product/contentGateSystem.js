/**
 * BRICLOG Content Gate System — 송출 직전 통합 품질 심사 SSOT
 * placeholder · 업종 오염 · 브랜드 존재감 · 주제 연관 · 반복 · 실질 정보
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { detectIndustryContamination } from "@/lib/product/industryContaminationEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { scoreInputTopicDominance } from "@/lib/content/v13ContentGate";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { getIndustryFlavorForInput, resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { topicRaw, topicWritingFacet } from "@/lib/content/topicFacetEngine";

export const CONTENT_GATE_VERSION = "v1";
export const CONTENT_GATE_MIN_SCORE = 90;
export const CONTENT_GATE_PLACEHOLDER_FAIL_COUNT = 3;

/** 본문 placeholder·깨진 문법 (GPT gate + prod 샘플 SSOT) */
const PLACEHOLDER_PATTERNS = [
  { id: "filler_utilize", re: /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/g },
  { id: "broken_bomyeon", re: /를\s*보면\s*에서/ },
  { id: "broken_josa_e", re: /를에\s/ },
  { id: "empty_related", re: /관련해서\s*를\s*보면/ },
  { id: "generic_service", re: /(?:좋은\s*내용|관련\s*정보|서비스\s*안내)(?:만|을|를)?\s*(?:정리|안내)/ },
  { id: "heading_utilize", re: /,\s*이용\s*볼\s*때\s*짚을\s*점/ },
];

/** 업종별 금칙 (타 업종 누출) */
const INDUSTRY_FORBIDDEN = {
  flower: [/전시대|쇼룸|매트리스|프레임|침실\s*연출|오피모|라인업\s*소개/i],
  cafe: [/전시대|매트리스|꽃다발|진료\s*접수/i],
  furniture: [],
  default: [],
};

const REPEAT_TEMPLATE_RES = [
  /계절·목적별로\s*달라지(?:는|지)\s*기준을\s*먼저\s*정리/,
  /조건(?:·구성)?을\s*중립적으로\s*정리(?:했|합)/,
  /제품·시즌에\s*따라\s*달라질\s*수\s*있/,
  /선택\s*시\s*먼저\s*확인(?:하는\s*편|해)/,
];

function countPlaceholderHits(full) {
  const hits = {};
  let total = 0;
  for (const { id, re } of PLACEHOLDER_PATTERNS) {
    const m = String(full || "").match(re);
    const n = m ? m.length : 0;
    if (n) {
      hits[id] = n;
      total += n;
    }
  }
  return { total, hits };
}

function countIndustryForbidden(full, input) {
  const key = resolveBriclogIndustryKey(input);
  const list = INDUSTRY_FORBIDDEN[key] || INDUSTRY_FORBIDDEN.default;
  const hits = [];
  for (const re of list) {
    if (re.test(full)) hits.push(re.source);
  }
  return hits;
}

function scoreBrandPresence(full, input) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = topicRaw(input);
  let score = 0;
  const found = [];
  if (brand && full.includes(brand.slice(0, Math.min(brand.length, 4)))) {
    score += 25;
    found.push("brand");
  }
  if (region && full.includes(region.split(" ")[0] || region)) {
    score += 20;
    found.push("region");
  }
  if (topic && full.includes(topic.slice(0, Math.min(8, topic.length)))) {
    score += 15;
    found.push("topic");
  }
  const { flavor } = getIndustryFlavorForInput(input);
  const productWord = flavor?.productWord || "";
  if (productWord && productWord.split(/[··]/).some((w) => w.length >= 2 && full.includes(w.trim()))) {
    score += 20;
    found.push("product");
  }
  if (/(?:운영|예약|픽업|배송|상담|문의|영업)/.test(full)) {
    score += 10;
    found.push("ops");
  }
  if (/(?:특징|차별|방식|구성|종류|톤|색감|향)/.test(full)) {
    score += 10;
    found.push("detail");
  }
  return { score: Math.min(100, score), found, ok: found.length >= 3 };
}

function scoreTitleBodyAlignment(pack, input) {
  const title = String(pack.representativeTitle || pack.title || "").trim();
  const full = getBlogFullText(pack);
  if (!title || !full) return { score: 0, ok: false };
  const titleTokens = title
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  if (!titleTokens.length) return { score: 70, ok: true };
  let hit = 0;
  for (const t of titleTokens) {
    if (full.includes(t)) hit += 1;
  }
  const ratio = hit / titleTokens.length;
  const score = Math.round(ratio * 100);
  return { score, ok: score >= 80, hit, total: titleTokens.length };
}

function scoreTemplateRepetition(full) {
  let count = 0;
  for (const re of REPEAT_TEMPLATE_RES) {
    const m = full.match(new RegExp(re.source, "g"));
    if (m) count += m.length;
  }
  return { count, ok: count < 3 };
}

function scoreSubstantiveInfo(full, input) {
  const info = scoreInformationYield(full, { input }, "blog");
  const sentences = splitKoreanSentences(full).filter((s) => s.replace(/\s/g, "").length >= 12);
  const concrete = sentences.filter((s) =>
    /(?:예|예를|추천|종류|색|향|가격|일정|재고|포장|리본|픽업|배송|시즌|여름|겨울|\d)/.test(s)
  );
  return {
    ok: info.ok && concrete.length >= 3,
    infoScore: info.score,
    concreteCount: concrete.length,
    reasons: info.reasons || [],
  };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessContentGate(pack, input = {}) {
  const full = getBlogFullText(pack);
  const reasons = [];
  let score = 100;

  const placeholder = countPlaceholderHits(full);
  if (placeholder.total >= CONTENT_GATE_PLACEHOLDER_FAIL_COUNT) {
    reasons.push("content_gate_placeholder");
    score -= Math.min(40, placeholder.total * 8);
  }

  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.re.test(full) && /broken|empty|heading/.test(re.id)) {
      reasons.push(`content_gate_${re.id}`);
      score -= 15;
    }
  }

  const industryForbidden = countIndustryForbidden(full, input);
  if (industryForbidden.length) {
    reasons.push("content_gate_industry_forbidden");
    score -= 20;
  }

  const industry = detectIndustryContamination(pack, input);
  if (!industry.ok) {
    reasons.push("industry_contamination");
    score -= 18;
  }

  const brand = scoreBrandPresence(full, input);
  if (!brand.ok) {
    reasons.push("content_gate_brand_presence");
    score -= 15;
  }

  const alignment = scoreTitleBodyAlignment(pack, input);
  if (!alignment.ok) {
    reasons.push("content_gate_title_alignment");
    score -= 12;
  }

  const repetition = scoreTemplateRepetition(full);
  if (!repetition.ok) {
    reasons.push("content_gate_template_repeat");
    score -= 20;
  }

  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });
  if (!dup.ok) {
    reasons.push("duplicate_killer_fail");
    score -= Math.min(25, dup.issues.length * 8);
  }

  const dominance = scoreInputTopicDominance(full, { input }, "blog");
  if (!dominance.ok) {
    reasons.push("topic_dominance_low");
    score -= 10;
  }

  const substantive = scoreSubstantiveInfo(full, input);
  if (!substantive.ok) {
    reasons.push("content_gate_substance");
    score -= 18;
  }

  const capped = Math.max(0, Math.min(100, score));
  const ok = capped >= CONTENT_GATE_MIN_SCORE;

  return {
    version: CONTENT_GATE_VERSION,
    score: capped,
    ok,
    minScore: CONTENT_GATE_MIN_SCORE,
    shouldWithhold: capped < CONTENT_GATE_MIN_SCORE,
    shouldRegen: capped < CONTENT_GATE_MIN_SCORE,
    reasons: [...new Set(reasons)],
    checks: {
      placeholder,
      industryForbidden,
      brand,
      alignment,
      repetition,
      substantive,
      dominance,
    },
    userMessage: ok
      ? null
      : "글 품질 기준(placeholder·반복·정보 부족)에 맞지 않아 다시 작성합니다.",
  };
}

/** placeholder·깨진 문장 제거 */
export function stripContentGateViolationsFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const dropRes = [
    ...PLACEHOLDER_PATTERNS.map((p) => p.re),
    /^(?:이용|안내)\s*—\s*당일/,
    /관련해서\s*를\s*보면/,
  ];
  const clean = (text) => {
    let t = String(text || "");
    for (const re of dropRes) {
      t = t.replace(re, " ");
    }
    return t.replace(/\s{2,}/g, " ").trim();
  };
  const cleanPara = (text) =>
    String(text || "")
      .split(/\n\n+/)
      .map((p) => clean(p))
      .filter((p) => p.replace(/\s/g, "").length >= 10)
      .join("\n\n");

  return {
    ...pack,
    sections: pack.sections.map((sec) => ({
      ...sec,
      heading: clean(sec.heading),
      body: cleanPara(sec.body),
    })),
    conclusion: pack.conclusion ? cleanPara(pack.conclusion) : pack.conclusion,
  };
}
