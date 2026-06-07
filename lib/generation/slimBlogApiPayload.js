/**
 * 블로그 API 전송 페이로드 슬림화 — 클라이언트 조사 결과만 전달 (과대 JSON → prod 500 방지)
 */

const HEAVY_STRIP_KEYS = new Set([
  "researchPayload",
  "clueDiscovery",
  "knowledgeMap",
  "searchExpansion",
  "approvedContentItems",
  "recentStructureArchives",
  "styleAnchors",
  "_webLeadsCache",
  "webLeads",
  "v3Verification",
  "nextEvolutionPreWrite",
  "brandInvestigationReport",
  "preGenerationMetrics",
  "pipelineOrder",
  "pipelineStages",
  "directorFeedbackSources",
  "geminiWriterOutline",
  "customerQuestionMap",
  "topicMap",
  "informationUnits",
  "knowledgeCoverage",
  "knowledgeExpansion",
  "editorColumnBrief",
  "coverageMapBrief",
  "knowledgeExpansionBrief",
  "informationUnitBrief",
  "topicMapBrief",
  "customerQuestionBrief",
  "v3BrandAnalysis",
  "v3RegionAnalysis",
  "v3TopicAnalysis",
  "v3ContentStrategy",
  "v3SeoStrategy",
  "v3Strategy",
  "seoStrategy",
  "strategy",
  "regionKeywordHints",
  "researchSufficiencyWarning",
]);

const STRING_BRIEF_KEYS = [
  "researchBrief",
  "v2AxisBrief",
  "factsPrompt",
  "v3MasterBrief",
  "brandContentBrief",
  "brandInvestigationBrief",
  "brandKnowledgeBrief",
  "brandPhilosophyBrief",
  "styleAnchorBrief",
  "combinedPersonalizationAddon",
  "personalizationAddon",
  "geminiWriterBrief",
  "directorMasterBrief",
];

const MAX_BRIEF_CHARS = 6_000;
const MAX_FACTS = 48;
const MAX_FACT_CHARS = 480;

function trimString(value, max) {
  const s = String(value ?? "").trim();
  if (!s) return undefined;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function slimFacts(facts = []) {
  const out = [];
  const seen = new Set();
  for (const row of facts) {
    if (out.length >= MAX_FACTS) break;
    const fact = trimString(
      typeof row === "string" ? row : row?.fact,
      MAX_FACT_CHARS
    );
    if (!fact) continue;
    const key = fact.slice(0, 64).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      typeof row === "string"
        ? { fact, source: "merged" }
        : {
            fact,
            source: row?.source,
            axis: row?.axis,
          }
    );
  }
  return out;
}

function slimBrandMemory(memory) {
  if (!memory || typeof memory !== "object") return memory;
  const {
    id,
    brandName,
    region,
    industry,
    brandDescription,
    mainKeyword,
    topic,
  } = memory;
  return {
    id,
    brandName,
    region,
    industry,
    brandDescription: trimString(brandDescription, 2000),
    mainKeyword,
    topic,
  };
}

/**
 * @param {object} input — 클라이언트 pipelineInput
 * @returns {object}
 */
export function slimBlogApiPayload(input = {}) {
  if (!input || typeof input !== "object") return input;

  const next = {};
  for (const [key, value] of Object.entries(input)) {
    if (HEAVY_STRIP_KEYS.has(key)) continue;
    if (key.startsWith("_")) continue;
    next[key] = value;
  }

  for (const key of STRING_BRIEF_KEYS) {
    if (next[key] != null) {
      const trimmed = trimString(next[key], MAX_BRIEF_CHARS);
      if (trimmed) next[key] = trimmed;
      else delete next[key];
    }
  }

  if (Array.isArray(next.researchFacts)) {
    next.researchFacts = slimFacts(next.researchFacts);
    next.researchFactCount = next.researchFacts.length;
  }

  if (next.brandMemory) {
    next.brandMemory = slimBrandMemory(next.brandMemory);
  }

  if (next.v2PreWriteVerification && typeof next.v2PreWriteVerification === "object") {
    next.v2PreWriteVerification = {
      ok: next.v2PreWriteVerification.ok !== false,
      pass: next.v2PreWriteVerification.pass !== false,
      soft: Boolean(next.v2PreWriteVerification.soft),
    };
  }

  return next;
}

export function estimateJsonBytes(value) {
  try {
    return JSON.stringify(value).length;
  } catch {
    return -1;
  }
}
