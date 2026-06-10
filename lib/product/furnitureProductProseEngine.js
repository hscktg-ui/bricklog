/**
 * 가구·프랜차이즈 매장 — 제품형 주제 (스트레스리스 체어 등)
 * 침대 전시·매트리스 템플릿과 분리
 */
import {
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { buildStoryTargetProblemOpening } from "@/lib/product/storyTargetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  buildChairExplainedParagraphs,
  isHollowInfoSentence,
  isKeywordToSentenceLeak,
} from "@/lib/product/briclogExplainEngine";
import { isDryFactSentence } from "@/lib/product/briclogExperienceOpinionEngine";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";

const FURNITURE_CHAIR_LEAK_RES = [
  /찾게\s*된\s*계기/,
  /전시\s*구성·안내|전시\s*구성\s*안내/,
  /쇼룸에서\s*직접\s*확인한\s*뒤/,
  /플레이스로\s*확인/,
  /^>\s*/,
  /비교가\s*수월/,
  /미리\s*보면\s*\.\s*>/,
  /인테리어·이사·교체에\s*맞는지/,
];

const CHAIR_PRODUCT_RE =
  /스트레스리스|stressless|다이닝체어|dining\s*chair|리클라이너\s*체어|체어\s*mint|mint\s*lb/i;

const MODEL_CODE_RE = /\b[A-Z]{2,}\s*[A-Z0-9]{2,}(?:\s+[A-Z]\d+)?\b/;

export function isFurnitureChairProductTopic(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.brandName || ""}`;
  const key = resolveBriclogIndustryKey(input);
  const furniture =
    key === "furniture" ||
    /가구|침대|에이스|쇼룸|furniture|침구/i.test(`${input.industry || ""} ${blob}`);
  return furniture && CHAIR_PRODUCT_RE.test(blob);
}

export function extractFurnitureProductLabel(input = {}) {
  const raw = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  const fullStressless = raw.match(/STRESSLESS\s+MINT\s+LB\s+D\d+/i);
  if (fullStressless) return fullStressless[0].trim();
  const model = raw.match(MODEL_CODE_RE)?.[0];
  if (model) return model.trim();
  if (/stressless/i.test(raw)) {
    const m = raw.match(/STRESSLESS[^\n,，.]{0,40}/i);
    return m ? m[0].trim() : "STRESSLESS";
  }
  return topicWritingFacet(input) || "다이닝체어";
}

function brandFactTokens(input = {}, p = {}) {
  const lines = [];
  const features = String(input.storeFeatures || "").trim();
  if (p.brand) lines.push(p.brand);
  const region = String(input.region || "").trim();
  if (region.length >= 2 && region !== "전국") lines.push(region);
  for (const part of features.split(/[,，·|/|\n]+/)) {
    const t = part.trim();
    if (t.length >= 2 && t.length <= 24) lines.push(t);
  }
  return lines;
}

/** 침대 전시 전용 — 체어 주제에서는 사용 금지 */
export function isFurnitureMattressExhibitionPad(text = "", input = {}) {
  if (!isFurnitureChairProductTopic(input)) return false;
  const t = String(text || "");
  const chairScene = /체어|다이닝|stressless|스트레스리스|좌판|등받이|리클라인|앉아/.test(t);
  if (chairScene) {
    return /누워|매트리스|헤드보드|침실\s*통로|프레임·침실\s*연출|10분\s*넘게\s*누워|지지감과\s*뒤척임/.test(t);
  }
  return (
    /누워|매트리스|헤드보드|침실\s*통로|프레임·침실\s*연출|전시\s*구성\s*안내|오피모/.test(t) ||
    /10분\s*넘게\s*누워|지지감과\s*뒤척임/.test(t)
  );
}

export function isFurnitureChairLeakSentence(text = "", input = {}) {
  if (!isFurnitureChairProductTopic(input)) return false;
  const t = String(text || "");
  return FURNITURE_CHAIR_LEAK_RES.some((re) => re.test(t));
}

export function isFurnitureEngineDefect(text = "", input = {}) {
  const t = String(text || "");
  if (!t.trim()) return true;
  if (isFurnitureChairLeakSentence(t, input)) return true;
  if (/\([^)]*기준\)/.test(t)) return true;
  if (/✔/.test(t)) return true;
  if (/이번\s*전시\s*을|전시\s*구성\s*안내|메뉴\s*기준/.test(t)) return true;
  if (/선택이\s*수월|비교가\s*수월|착와감|전시\s*소식/.test(t)) return true;
  if (/에이스침대\s*안내\s*[A-Z0-9]/.test(t)) return true;
  if (/동선와\s*재질을/.test(t)) return true;
  if (isFurnitureMattressExhibitionPad(t, input)) return true;
  if (isHollowInfoSentence(t) || isKeywordToSentenceLeak(t)) return true;
  if (isDryFactSentence(t)) return true;
  return false;
}

/**
 * @returns {string[]}
 */
export function buildFurnitureChairProductParagraphs(p, input = {}, researchLines = []) {
  const product = extractFurnitureProductLabel(input);
  const explained = buildChairExplainedParagraphs(p, input, product);
  if (shouldForceMissionProseOnlyPath(input)) {
    return [...explained, ...researchLines];
  }
  const storyOpening = buildStoryTargetProblemOpening(input);
  if (storyOpening && !explained.some((line) => line.slice(0, 20) === storyOpening.slice(0, 20))) {
    return [storyOpening, ...explained, ...researchLines];
  }
  return [...explained, ...researchLines];
}

/** 체어 제품형 — 전시·방문 템플릿 제거 */
export function scrubFurnitureChairPack(pack, input = {}) {
  if (!isFurnitureChairProductTopic(input) || !pack?.sections?.length) return pack;
  const seen = new Set();
  const sections = (pack.sections || [])
    .map((sec) => {
      const kept = String(sec.body || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => {
          if (p.replace(/\s/g, "").length < 12) return false;
          if (isFurnitureEngineDefect(p, input)) return false;
          const key = p.replace(/\s/g, "").slice(0, 48);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      const heading = isFurnitureChairLeakSentence(sec.heading, input) ? "" : sec.heading;
      return { ...sec, heading, body: kept.join("\n\n").trim() };
    })
    .filter((s) => s.body.replace(/\s/g, "").length >= 24);

  let conclusion = String(pack.conclusion || "").trim();
  if (isFurnitureEngineDefect(conclusion, input)) conclusion = "";

  return { ...pack, sections, conclusion: conclusion || undefined };
}

export function buildFurnitureChairFieldPad(p, input = {}, slot = 0) {
  const product = extractFurnitureProductLabel(input);
  const variants = buildChairExplainedParagraphs(p, input, product);
  return variants[slot % variants.length];
}
