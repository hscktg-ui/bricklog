/**
 * 꽃집 · 꽃 추천 — V3 Explain Engine (키워드→문장 금지)
 */
import {
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  buildFlowerExplainParagraphs,
  isKeywordToSentenceLeak,
  isHollowInfoSentence,
} from "@/lib/product/briclogExplainEngine";
import { isDryFactSentence } from "@/lib/product/briclogExperienceOpinionEngine";

const RECOMMENDATION_TOPIC_RE =
  /(?:꽃\s*추천|어떤\s*꽃|꽃\s*이름|여름\s*꽃|봄\s*꽃|가을\s*꽃|겨울\s*꽃|시즌\s*꽃|꽃다발\s*추천)/;

export function isFlowerRecommendationTopic(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.writingSubject || ""}`;
  const key = resolveBriclogIndustryKey(input);
  const isFlower = key === "flower" || key === "unmanned_flower" || /꽃|플라워|flower/i.test(`${input.industry || ""}`);
  return isFlower && RECOMMENDATION_TOPIC_RE.test(blob);
}

export function isUnmannedFlowerShop(input = {}) {
  const blob = `${input.storeFeatures || ""} ${input.brandDescription || ""} ${input.brandName || ""}`;
  return /무인|24\s*시간|셀프|키오스크|무인꽃|그랩앤고|grab/i.test(blob);
}

/**
 * @returns {string[]}
 */
export function buildFlowerRecommendationMissionParagraphs(p, input = {}, researchLines = []) {
  return [
    ...buildFlowerExplainParagraphs(p, input),
    ...researchLines,
  ];
}

export function buildFlowerRecommendationFieldPad(p, input = {}, slot = 0) {
  const lines = buildFlowerExplainParagraphs(p, input);
  return lines[slot % lines.length] || lines[0] || "";
}

const FLOWER_RECOMMENDATION_LEAK_RES = [
  /들어서서\s*본\s*첫인상/,
  /직접\s*들어가/,
  /직접\s*다녀/,
  /직접\s*가\s*본/,
  /직접\s*확인해\s*보니/,
  /눈으로\s*확인/,
  /찾게\s*된\s*계기/,
  /안내을\s*고를/,
  /쇼룸\s*안내/,
  /매장\s*안내/,
  /브랜드\s*안내/,
  /현장\s*매장|현장\s*.+—/,
  /근처\s*.+에서\s*자주\s*문의/,
  /꽃\s*추천\s*글을\s*읽다\s*보면/,
  /이름만\s*나열한\s*문장과/,
  /꽃\s*이름·포장\s*톤·픽업\s*시간\s*순으로/,
  /두\s*가지\s*안을\s*놓고/,
  /달라진\s*기준/,
  /솔직히\s+.+알아보던\s+중/,
  /정리하면\s+.+직접\s*가\s*본\s*뒤/,
  /플라워샵에서\s*직접\s*확인/,
  /첫\s*방문\s*때/,
  /직원분|상담\s*초반|보여\s*주셔서|짚어\s*주셔서/,
  /수월했|비교가\s*수월|맞추기\s*수월/,
];

/** 직원·방문 후기·브로슈어·키워드→문장 제거 */
export function isFlowerStaffVisitTemplate(text = "", input = {}) {
  if (!isUnmannedFlowerShop(input) && !isFlowerRecommendationTopic(input)) return false;
  const t = String(text || "");
  if (FLOWER_RECOMMENDATION_LEAK_RES.some((re) => re.test(t))) return true;
  return (
    /안내\s*구성|구성\s*구성/.test(t) ||
    /확인해\s*확인해/.test(t) ||
    isKeywordToSentenceLeak(t) ||
    isHollowInfoSentence(t) ||
    isDryFactSentence(t)
  );
}

/** 강제 mission 팩 — 방문 톤·중복 문장 제거 */
export function scrubFlowerRecommendationPack(pack, input = {}) {
  if (!isFlowerRecommendationTopic(input) || !pack?.sections?.length) return pack;
  const seen = new Set();
  const sections = (pack.sections || [])
    .map((sec) => {
      const kept = String(sec.body || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => {
          if (p.replace(/\s/g, "").length < 12) return false;
          if (isFlowerStaffVisitTemplate(p, input)) return false;
          const key = p.replace(/\s/g, "").slice(0, 48);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      const heading = isFlowerStaffVisitTemplate(sec.heading, input) ? "" : sec.heading;
      return { ...sec, heading, body: kept.join("\n\n").trim() };
    })
    .filter((s) => s.body.replace(/\s/g, "").length >= 24);

  let conclusion = String(pack.conclusion || "").trim();
  if (isFlowerStaffVisitTemplate(conclusion, input)) conclusion = "";
  const concKey = conclusion.replace(/\s/g, "").slice(0, 48);
  if (concKey && seen.has(concKey)) conclusion = "";

  return {
    ...pack,
    sections,
    conclusion: conclusion || undefined,
  };
}
