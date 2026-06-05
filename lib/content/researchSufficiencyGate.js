/**

 * 조사 충분성 게이트 — 온라인 1건·입력·조사 완료 시 작성 허용 (신생 브랜드 차단 금지)

 */

import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";

import { isBriclogMissionEnforced } from "@/lib/product/briclogMission";

import { useGeminiResearchProvider } from "@/lib/config/briclogFastPipeline";

import { buildSupplementalResearchPlan } from "@/lib/product/contentQualityEngine";

import {

  collectMergedResearchFacts,

  evaluateResearchWriteGate,

  formatCustomerResearchBlockMessage,

  hasAnyOnlineResearchSignal,

  MIN_RESEARCH_FACTS_FOR_FIRST_WRITE,

  resolveMinResearchFactsForWrite,

} from "@/lib/product/researchReadiness";



export { MIN_RESEARCH_FACTS_FOR_FIRST_WRITE };



function collectFacts(input = {}, parsed = {}, research = {}) {

  return collectMergedResearchFacts(input, parsed, research);

}



/**

 * @param {Record<string, unknown>} input

 * @param {object} [parsed]

 * @param {object} [research]

 */

export function assessResearchSufficiencyForWrite(input = {}, parsed = {}, research = {}) {

  if (!isBriclogMissionEnforced()) {

    return { ok: true, sufficient: true, reasons: [], factCount: parsed?.factCount ?? 0 };

  }



  const gate = evaluateResearchWriteGate(input, parsed, research);

  const facts = collectFacts(input, parsed, research);

  const factCount = facts.length;

  const minFacts = resolveMinResearchFactsForWrite(input, parsed, research);

  const onlineSignal = hasAnyOnlineResearchSignal(input, parsed, research);



  const advisory = [];

  if (factCount < minFacts && !gate.ok) advisory.push("research_facts_thin");

  if (gate.ok && factCount < minFacts && !onlineSignal) {

    advisory.push("research_facts_thin_soft");

  }



  if (useGeminiResearchProvider() && isGeminiConfigured() && gate.ok) {

    const geminiPackUsed =

      research?.mode === "gemini_research_pack" ||

      Boolean(research?.geminiWriterBrief) ||

      Boolean(input.geminiWriterBrief);

    if (!geminiPackUsed && !onlineSignal && factCount < 3) {

      advisory.push("gemini_research_incomplete_soft");

    }

  }



  const supplemental = buildSupplementalResearchPlan(input, gate.ok ? [] : gate.reasons);

  const userMessage = gate.ok

    ? null

    : supplemental.message ||

      formatCustomerResearchBlockMessage(input, gate.reasons, {

        factCount,

        parsed,

        research,

      });



  return {

    ok: gate.ok,

    sufficient: gate.ok,

    soft: gate.soft,

    mode: gate.mode,

    reasons: gate.ok ? advisory : gate.reasons,

    factCount,

    minFacts,

    onlineSignal,

    thinContext: gate.soft,

    supplemental,

    userMessage,

  };

}



export function researchGateBlockedForInsufficient(input = {}, parsed = {}, research = {}) {

  const assessment = assessResearchSufficiencyForWrite(input, parsed, research);

  if (assessment.ok) return null;

  return {

    ok: false,

    userMessage: assessment.userMessage,

    mode: "research_insufficient",

    reasons: assessment.reasons,

    meta: { factCount: assessment.factCount },

  };

}


