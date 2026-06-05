/**
 * 콘텐츠 품질·조사 충분성 미달 시 추가 조사 자동 실행
 */
import { runResearch } from "@/lib/research/runResearch";
import {
  buildSupplementalResearchPlan,
  assertPreWriteContentQuality,
} from "@/lib/product/contentQualityEngine";
import { assessResearchSufficiencyForWrite } from "@/lib/content/researchSufficiencyGate";
import { parseV2AxisResearch } from "@/lib/content/v2AxisResearch";
import {
  augmentFactsFromLocalContext,
  assessResearchDepth,
  formatDepthFactsPrompt,
  buildDepthWritingBrief,
} from "@/lib/content/researchDepthEngine";
import { collectResearchFacts } from "@/lib/content/v2ResearchFacts";
import { defaultAutoResearchTypes } from "@/lib/research/needsOnlineResearch";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import {
  prepareBriclogPreWriteContext,
  attachPreWriteContextToPipeline,
} from "@/lib/content/briclogPreWriteContext";

export const SUPPLEMENTAL_MAX_ROUNDS = 2;
export const SUPPLEMENTAL_STAGE_LABEL = "브랜드·주제 조사 보강 중…";

const SOURCE_STAGE = {
  gemini: "gemini",
  naver: "web",
  official: "official",
  faq: "related",
  reviews: "articles",
};

export function mergeUniqueFacts(base = [], extra = []) {
  const out = [];
  const seen = new Set();
  for (const row of [...base, ...extra]) {
    const fact = String(row?.fact || row || "").trim();
    if (fact.length < 4) continue;
    const k = fact.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(
      typeof row === "object" && row !== null && row.fact
        ? row
        : { axis: "mixed", fact, source: "supplemental" }
    );
  }
  return out;
}

function sourceToResearchTypes(source = "") {
  switch (source) {
    case "naver":
      return ["local", "keyword", "articles"];
    case "official":
      return ["keyword", "latest"];
    case "faq":
      return ["keyword", "articles"];
    case "reviews":
      return ["articles", "trend"];
    default:
      return ["latest", "keyword", "articles", "trend"];
  }
}

function mergeResearchSummaries(primary = {}, extra = {}) {
  const parts = [primary?.summary, extra?.summary].filter((s) => String(s || "").trim());
  return {
    ...primary,
    ...extra,
    summary: parts.join("\n\n").slice(0, 6000) || primary?.summary || extra?.summary,
    geminiWriterBrief: extra?.geminiWriterBrief || primary?.geminiWriterBrief,
    geminiWriterOutline: extra?.geminiWriterOutline || primary?.geminiWriterOutline,
    v2Axis: {
      ...(primary?.v2Axis || {}),
      ...(extra?.v2Axis || {}),
      researchStatus: "ok",
      insufficient: false,
      researchFacts: mergeUniqueFacts(
        primary?.v2Axis?.researchFacts || [],
        extra?.v2Axis?.researchFacts || collectResearchFacts(extra, {}, {})
      ),
    },
  };
}

function rebuildParsed(input, brandResearch, research, facts) {
  const depth = assessResearchDepth(facts.length, input);
  let parsed = parseV2AxisResearch(research, input, brandResearch, { facts, depth });
  if (!parsed.ok) {
    const depthBrief = buildDepthWritingBrief(depth, input);
    parsed = {
      ...parsed,
      ok: true,
      insufficient: false,
      verified: true,
      depthTier: depth.tier || "contextual",
      factsPrompt:
        parsed.factsPrompt || formatDepthFactsPrompt(facts, depth, input),
      brief: [depthBrief, parsed.brief].filter(Boolean).join("\n\n"),
      facts,
      factCount: facts.length,
    };
  } else {
    parsed = { ...parsed, facts, factCount: facts.length };
  }
  return parsed;
}

/**
 * @param {object} opts
 */
export async function runSupplementalResearchQueries({
  input = {},
  parsed = {},
  research = {},
  plans = [],
  brandResearch = null,
  onStep,
  runResearch: runFn = runResearch,
}) {
  const types = defaultAutoResearchTypes(input);
  const regionHints = buildRegionKeywordHints(input);
  let facts = mergeUniqueFacts(
    parsed?.facts || [],
    augmentFactsFromLocalContext([], input, brandResearch)
  );
  let mergedResearch = research || {};

  for (const plan of plans.slice(0, 6)) {
    const query = String(plan?.query || "").trim();
    if (!query) continue;
    const stage = SOURCE_STAGE[plan.source] || "related";
    onStep?.(SUPPLEMENTAL_STAGE_LABEL);

    try {
      const extra = await runFn({
        query,
        types: sourceToResearchTypes(plan.source),
        brandContext: {
          brandName: input.brandName,
          region: input.region,
          industry: input.industry,
          mainKeyword: input.mainKeyword,
          topic: input.topic || input.mainKeyword,
          brandDescription: input.brandDescription,
          clueDiscovery: input.clueDiscovery,
          searchExpansion: input.searchExpansion,
          knowledgeCoverage: input.knowledgeCoverage,
          _webLeadsCache: input._webLeadsCache,
        },
        mode: "v2_axis_depth",
        regionKeywordHints: regionHints,
      });
      const extraFacts = collectResearchFacts(extra, input, brandResearch);
      facts = mergeUniqueFacts(facts, extraFacts);
      mergedResearch = mergeResearchSummaries(mergedResearch, extra);
    } catch {
      /* 단일 축 실패 시 다음 계획 진행 */
    }
  }

  const rebuilt = rebuildParsed(input, brandResearch, mergedResearch, facts);
  return {
    parsed: rebuilt,
    research: mergedResearch,
    factCount: facts.length,
    supplementalRan: true,
  };
}

function preWriteStillThin(input = {}, parsed = {}, research = {}) {
  const suff = assessResearchSufficiencyForWrite(input, parsed, research);
  const content = assertPreWriteContentQuality({
    ...input,
    v2AxisParsed: parsed,
    research,
    researchFacts: parsed?.facts,
    researchFactCount: parsed?.factCount,
  });
  return {
    ok: suff.ok && content.ok,
    reasons: [...new Set([...(suff.reasons || []), ...(content.reasons || [])])],
    sufficiency: suff,
    contentQuality: content,
  };
}

/**
 * 조사·정보 단위 미달 시 계획된 추가 조사를 실행하고 pre-write 컨텍스트를 갱신한다.
 */
export async function ensureSupplementalResearchReady({
  input = {},
  parsed = {},
  research = {},
  brandResearch = null,
  pipelineInput = null,
  onStep,
  maxRounds = SUPPLEMENTAL_MAX_ROUNDS,
  runResearch: runFn = runResearch,
}) {
  let currentParsed = parsed;
  let currentResearch = research;
  let roundsRun = 0;

  for (let round = 0; round < maxRounds; round++) {
    const check = preWriteStillThin(input, currentParsed, currentResearch);
    if (check.ok) break;

    const { plans } = buildSupplementalResearchPlan(input, check.reasons);
    if (!plans.length) break;

    onStep?.(`${SUPPLEMENTAL_STAGE_LABEL} (${round + 1}/${maxRounds})`);
    const result = await runSupplementalResearchQueries({
      input,
      parsed: currentParsed,
      research: currentResearch,
      plans,
      brandResearch,
      onStep,
      runResearch: runFn,
    });
    currentParsed = result.parsed;
    currentResearch = result.research;
    roundsRun += 1;

    input.researchFacts = currentParsed.facts;
    input.researchFactCount = currentParsed.factCount;
    input.v2AxisParsed = currentParsed;
    if (pipelineInput) {
      pipelineInput.researchFacts = currentParsed.facts;
      pipelineInput.researchFactCount = currentParsed.factCount;
      pipelineInput.factsPrompt = currentParsed.factsPrompt;
    }

    const preWrite = prepareBriclogPreWriteContext({
      ...input,
      researchFacts: currentParsed.facts,
    });
    if (pipelineInput) {
      attachPreWriteContextToPipeline(pipelineInput, preWrite);
    }
    Object.assign(input, {
      knowledgeCoverage: preWrite.knowledgeCoverage,
      coverageMapBrief: preWrite.coverageMapBrief,
      informationUnits: preWrite.informationUnits,
      informationUnitBrief: preWrite.informationUnitBrief,
      knowledgeExpansion: preWrite.knowledgeExpansion,
      knowledgeExpansionReady: preWrite.knowledgeExpansionReady,
      knowledgeExpansionBrief: preWrite.knowledgeExpansionBrief,
      searchExpansion: preWrite.searchExpansion,
      editorColumnBrief: preWrite.editorColumnBrief,
      customerQuestionMap: preWrite.customerQuestionMap,
      customerQuestionBrief: preWrite.customerQuestionBrief,
    });
  }

  const finalCheck = preWriteStillThin(input, currentParsed, currentResearch);
  return {
    parsed: currentParsed,
    research: currentResearch,
    input,
    pipelineInput,
    roundsRun,
    sufficient: finalCheck.ok,
    reasons: finalCheck.reasons,
    supplementalMessage: buildSupplementalResearchPlan(input, finalCheck.reasons).message,
  };
}
