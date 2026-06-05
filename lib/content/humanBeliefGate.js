/**
 * Human Belief — 로컬 편집 패스 + 판정 + meta
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  AD_SMELL_RES,
  HUMAN_BELIEF_MIN_SCORE,
  isHumanBeliefEnforced,
  scoreHumanBelief,
} from "@/lib/product/humanBeliefEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  applyNarrativeBeliefPass,
  shouldApplyNarrativeBeliefPass,
} from "@/lib/content/narrativeBeliefPass";

const LOCAL_STRIP_RES = [
  [/제품은\s*이렇습니다\.?/g, ""],
  [/다음과\s*같습니다\.?/g, ""],
  [/지금\s*바로\s*문의(?:해\s*주세요|하세요)\.?/g, ""],
  [/놓치지\s*마세요\.?/g, ""],
  [/많은\s*분들께\s*추천(?:드립니다|합니다)\.?/g, ""],
  [/소개해\s*드립니다\.?/g, ""],
  [/알려\s*드리(?:요|습니다)\.?/g, ""],
  [/도움이\s*되(?:었|시)길\s*바랍니다\.?/g, ""],
  [/완벽한\s*솔루션/g, ""],
  [/최고의\s*선택/g, ""],
];

export function applyLocalEditorBeliefPassToText(text) {
  let next = String(text || "");
  for (const [re, rep] of LOCAL_STRIP_RES) {
    next = next.replace(re, rep);
  }
  const sentences = splitKoreanSentences(next).filter((s) => {
    if (s.replace(/\s/g, "").length < 8) return false;
    return !AD_SMELL_RES.slice(0, 6).some((re) => re.test(s) && s.length < 50);
  });
  return sentences.join("\n\n").trim();
}

/**
 * @param {object} pack
 */
export function applyLocalEditorBeliefPass(pack) {
  if (!isHumanBeliefEnforced() || !pack) return pack;
  let next = { ...pack };
  if (next.conclusion) {
    next.conclusion = applyLocalEditorBeliefPassToText(next.conclusion);
  }
  if (Array.isArray(next.sections)) {
    next.sections = next.sections.map((s) => ({
      ...s,
      body: s?.body ? applyLocalEditorBeliefPassToText(s.body) : s?.body,
    }));
  }
  return next;
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyHumanBeliefGate(pack, ctx = {}) {
  if (!isHumanBeliefEnforced() || !pack) return pack;

  const input = ctx.input || ctx;
  const scoreCtx = {
    ...input,
    approvedContentCount:
      input.approvedContentCount ?? ctx.approvedContentCount,
    brandApprovedContentBrief: input.brandApprovedContentBrief,
    styleAnchorBrief: input.styleAnchorBrief,
  };

  const beforeFull = getBlogFullText(pack);
  const beforeBelief = scoreHumanBelief(beforeFull, scoreCtx, pack);

  let next = applyLocalEditorBeliefPass(pack);
  const needsNarrative =
    shouldApplyNarrativeBeliefPass(next, ctx) ||
    beforeBelief.score < 78 ||
    !beforeBelief.ok ||
    /방문·체험·비교를\s*전제로|공식·매장\s*안내\s*기준|모션베드을|특별할인를|알려드리|소개해\s*드립|많은\s*분들께/.test(
      getBlogFullText(next)
    );
  if (needsNarrative) {
    next = applyNarrativeBeliefPass(next, ctx);
    next = applyLocalEditorBeliefPass(next);
  }
  const full = getBlogFullText(next);

  const afterBelief = scoreHumanBelief(full, scoreCtx, next);
  const narrativeApplied = Boolean(next._meta?.narrativeBeliefPass?.applied);
  const mergedIssues = narrativeApplied
    ? afterBelief.issues || []
    : [...new Set([...(beforeBelief.issues || []), ...(afterBelief.issues || [])])];
  const finalScore = narrativeApplied
    ? afterBelief.score
    : Math.min(beforeBelief.score, afterBelief.score);

  const belief = {
    ...afterBelief,
    score: finalScore,
    issues: mergedIssues,
    ok:
      finalScore >= HUMAN_BELIEF_MIN_SCORE &&
      !beliefIssuesBlock(mergedIssues) &&
      !mergedIssues.includes("checklist_voice") &&
      !mergedIssues.includes("coverage_slot_dump"),
    adHits: Math.max(beforeBelief.adHits, afterBelief.adHits),
    fieldHits: afterBelief.fieldHits,
    strippedAdPhrases: beforeBelief.adHits > afterBelief.adHits,
  };

  function beliefIssuesBlock(issues) {
    return issues.includes("brochure_voice") || issues.includes("ad_smell_high");
  }

  const grounded = scoreGroundedSpecificity(next, ctx, input.researchFacts);

  const failReasons = [];
  if (!belief.ok) failReasons.push("human_belief_low");
  const factCount = (input.researchFacts || []).length;
  if (!grounded.ok && factCount >= 2) failReasons.push("grounded_specificity_low");

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanBelief: {
        ...belief,
        grounded,
        failReasons,
        localEditorPass: true,
        narrativeBeliefPass: Boolean(next._meta?.narrativeBeliefPass?.applied),
      },
      humanBeliefScore: belief.score,
      groundedSpecificityScore: grounded.score,
    },
  };
}

export { scoreHumanBelief, scoreGroundedSpecificity };
