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
import { isFieldReviewSpeaker } from "@/lib/persona/speakerVoiceLock";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isCatalogContaminationSentence } from "@/lib/product/catalogContaminationGuard";
import {
  shieldUtilizeGuidePhrase,
  unshieldUtilizeGuidePhrase,
} from "@/lib/content/placeholderContaminationEngine";

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
  { id: "exhibition_leak", re: /전시\s*소식/ },
  { id: "neutral_summary", re: /중립적으로\s*정리/ },
  { id: "compare_easy", re: /비교가\s*수월해요/ },
  { id: "hollow_confirm", re: /확인해\s*보았습니다/ },
  { id: "this_config", re: /이\s*구성/ },
  { id: "condition_config", re: /조건\s*및\s*구성/ },
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

function assessEditorialQualityFastPass(pack, input = {}) {
  if (!pack?._meta?.editorialQualityStandard && !pack?._meta?.editorialQualityReshape) {
    return null;
  }
  const full = getBlogFullText(pack);
  const placeholder = countPlaceholderHits(full);
  if (placeholder.total >= CONTENT_GATE_PLACEHOLDER_FAIL_COUNT) return null;

  for (const { id, re } of PLACEHOLDER_PATTERNS) {
    if (re.test(full) && /broken|empty|heading/.test(id)) return null;
  }

  const industryForbidden = countIndustryForbidden(full, input);
  if (industryForbidden.length) return null;

  const industry = detectIndustryContamination(pack, input);
  if (!industry.ok) return null;

  const brand = scoreBrandPresence(full, input);
  const alignment = scoreTitleBodyAlignment(pack, input);
  const repetition = scoreTemplateRepetition(full);
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });
  const substantive = scoreSubstantiveInfo(full, input);

  if (!brand.ok || !alignment.ok || !repetition.ok || !dup.ok || substantive.concreteCount < 3) {
    return null;
  }

  const score = Math.max(
    CONTENT_GATE_MIN_SCORE,
    Math.min(100, 88 + Math.min(12, substantive.concreteCount))
  );

  return {
    version: CONTENT_GATE_VERSION,
    score,
    ok: true,
    minScore: CONTENT_GATE_MIN_SCORE,
    shouldWithhold: false,
    shouldRegen: false,
    reasons: [],
    checks: {
      placeholder,
      industryForbidden,
      brand,
      alignment,
      repetition,
      substantive,
      editorialQualityFastPass: true,
    },
    userMessage: null,
  };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessContentGate(pack, input = {}) {
  const editorialPass = assessEditorialQualityFastPass(pack, input);
  if (editorialPass) return editorialPass;

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

function pickNeutralGateFallback(input = {}, slot = 0) {
  const brand = String(input.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || "안내").trim();
  const key = resolveBriclogIndustryKey(input);
  const byKey = {
    craft: [
      `${brand || topic} 체험은 소요 시간·난이도·완성품 수령 방법을 예약 전에 확인하는 편이 좋습니다.`,
      "처음 방문하는 분은 옷·액세서리 착용 안내와 주차 위치를 함께 확인하세요.",
    ],
    pet_cafe: [
      `${brand || "매장"} 입장 규칙·체중 제한·리드줄 안내를 방문 전에 확인하는 편이 좋습니다.`,
      "반려견 성격에 맞는 비혼잡 시간대를 선택하면 더 편안한 방문이 됩니다.",
    ],
    restaurant: [
      `${brand || topic} 방문 전 인원·시간·예산을 정리해 두면 추천 메뉴 상담이 수월합니다.`,
      "주차·대기·룸 좌석 여부는 예약 시 함께 확인하는 편이 좋습니다.",
    ],
    furniture: [
      `${brand || topic} 방문·상담 전 희망 모델·방 크기·배송 희망일을 알려 주시면 안내가 수월합니다.`,
      "쇼룸 체험은 예약 후 진행되며, 운영 시간은 플레이스·전화로 확인해 주세요.",
    ],
  };
  const generic = [
    brand
      ? `${brand} ${topic} 관련 안내는 운영 시간·예약·주차를 방문 전에 확인하는 편이 좋습니다.`
      : `${topic} 관련 조건은 방문·문의 전에 정리해 두면 선택이 수월합니다.`,
    brand
      ? `${brand}에서 궁금한 점은 전화·방문으로 확인하시면 일정에 맞춰 안내드릴 수 있습니다.`
      : "세부 조건은 매장 문의로 맞추는 편이 좋습니다.",
  ];
  const pool = byKey[key] || generic;
  return pool[slot % pool.length];
}

/** placeholder·깨진 문장 제거 */
export function stripContentGateViolationsFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const skipCatalogFallback =
    isGpt55WriterDominant() &&
    (/^llm_/.test(String(pack?._meta?.generationMode || "")) ||
      Boolean(pack?._meta?.briclogWriterEngine));
  const dropRes = [
    ...PLACEHOLDER_PATTERNS.map((p) => p.re),
    /^(?:이용|안내)\s*—\s*당일/,
    /관련해서\s*를\s*보면/,
  ];
  const clean = (text) => {
    let t = shieldUtilizeGuidePhrase(text);
    for (const re of dropRes) {
      t = t.replace(re, " ");
    }
    t = unshieldUtilizeGuidePhrase(t);
    return t.replace(/\s{2,}/g, " ").trim();
  };
  const visitFictionRe =
    /누워\s*보|메모(?:해|한)\s*(?:뒀|두)|당일\s*들(?:은|어)|실측/;
  const brand = String(input.brandName || "").trim();
  const usedFallbacks = new Set();
  let fallbackSlot = 0;
  const nextFallback = () => {
    let line = pickNeutralGateFallback(input, fallbackSlot++);
    while (usedFallbacks.has(line) && fallbackSlot < 8) {
      line = pickNeutralGateFallback(input, fallbackSlot++);
    }
    usedFallbacks.add(line);
    return line;
  };
  const cleanPara = (text) =>
    String(text || "")
      .split(/\n\n+/)
      .map((p) => clean(p))
      .map((p) => {
        if (isFieldReviewSpeaker(input)) return p;
        if (brand && p.trim() === brand) return "";
        const kept = splitKoreanSentences(p)
          .filter((s) => !visitFictionRe.test(s))
          .filter((s) => !isCatalogContaminationSentence(s))
          .join(" ")
          .trim();
        if (kept.replace(/\s/g, "").length >= 24) return kept;
        if (kept.replace(/\s/g, "").length >= 12 && /[.!?]$/.test(kept)) return kept;
        if (skipCatalogFallback) return kept;
        return nextFallback();
      })
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
