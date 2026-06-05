/**
 * 조사 팩트·구체 디테일이 본문에 박혔는지 검증
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { factTextsFromList } from "@/lib/content/v2ResearchFacts";
import { scoreResearchGrounding } from "@/lib/content/v2AxisSentencePrune";
import { isHumanBeliefEnforced } from "@/lib/product/humanBeliefEngine";

const CONCRETE_DETAIL_RES = [
  /\d{1,2}월/,
  /\d{1,2}일/,
  /\d+%/,
  /\d[\d,]*\s*원/,
  /~\s*\d/,
  /(?:평|㎡|m²)/,
  /(?:AM|PM|오전|오후)\s*\d/,
  /(?:까지|부터|기간)/,
  /(?:매장|쇼룸|작업장)/,
];

export const GROUNDED_MIN_FACT_ANCHORS = 2;
export const GROUNDED_MIN_CONCRETE_MARKERS = 1;
export const GROUNDED_MIN_RATIO = 0.55;

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object[]} [researchFacts]
 */
export function scoreGroundedSpecificity(pack, ctx = {}, researchFacts = []) {
  if (!isHumanBeliefEnforced()) {
    return { ok: true, score: 10, factAnchors: 0, concreteMarkers: 0, issues: [] };
  }

  const input = ctx.input || ctx;
  const facts = researchFacts.length
    ? researchFacts
    : input.researchFacts || ctx.researchFacts || [];
  const full = getBlogFullText(pack);
  const factTexts = factTextsFromList(facts);
  const issues = [];

  let factAnchors = 0;
  for (const f of factTexts) {
    const fact = String(f).trim();
    if (fact.length < 4) continue;
    if (full.includes(fact)) {
      factAnchors += 1;
      continue;
    }
    const anchor = fact.length > 14 ? fact.slice(0, 10) : fact;
    if (anchor.length >= 4 && full.includes(anchor)) factAnchors += 1;
  }

  let concreteMarkers = 0;
  for (const re of CONCRETE_DETAIL_RES) {
    if (re.test(full)) concreteMarkers += 1;
  }

  const grounding = scoreResearchGrounding(full, ctx, facts);

  if (factTexts.length >= 2 && factAnchors < GROUNDED_MIN_FACT_ANCHORS) {
    issues.push("grounded_facts_low");
  }
  if (concreteMarkers < GROUNDED_MIN_CONCRETE_MARKERS) {
    issues.push("concrete_detail_low");
  }
  if (grounding.ratio < GROUNDED_MIN_RATIO && grounding.total >= 4) {
    issues.push("grounding_ratio_low");
  }

  let score = 70;
  score += Math.min(15, factAnchors * 4);
  score += Math.min(10, concreteMarkers * 3);
  score += Math.round((grounding.ratio || 0) * 10);
  score = Math.max(0, Math.min(100, score));

  const ok =
    issues.length === 0 ||
    (factTexts.length < 2 && concreteMarkers >= 1 && grounding.ratio >= 0.45);

  return {
    ok,
    score,
    factAnchors,
    concreteMarkers,
    grounding,
    issues,
  };
}
