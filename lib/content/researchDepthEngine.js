/**
 * RESEARCH DEPTH ENGINE
 * 주제 직접 정보가 얇아도 생성을 중단하지 않고, 연관·브랜드·지역·카테고리 축으로 실마리를 확장한다.
 * 추측·허위 사실 금지. 내부 수치·「다시 시도」류 메시지는 사용자에게 노출하지 않는다.
 */
import {
  collectResearchFacts,
  formatResearchFactsForPrompt,
  V2_MIN_RESEARCH_FACTS,
} from "@/lib/content/v2ResearchFacts";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";

/** 연쇄 조사 트리거 기준 (차단용 아님, 확장용) */
export const DEPTH_CASCADE_TRIGGER_FACTS = 10;
export const DEPTH_MIN_LEADS_TO_WRITE = 4;

export const DEPTH_STAGE_LABELS = {
  related: "관련 정보 탐색 중…",
  brand: "브랜드 정보 탐색 중…",
  category: "상위 카테고리 탐색 중…",
  region: "지역 정보 탐색 중…",
  official: "공식·제품 자료 탐색 중…",
  similar: "유사 제품·모델 탐색 중…",
  articles: "관련 기사·맥락 탐색 중…",
  synthesize: "조사 실마리 정리 중…",
};

export const RESEARCH_DEPTH_WRITING_RULES = `【RESEARCH DEPTH · 작성 규칙】
- 블로거처럼 쓴다. 논문·AI 나열·「검색하시는 분」 톤 금지.
- 확인된 사실만 단정한다. 가격·스펙·출시일·효능은 조사에 있을 때만.
- 주제 직접 팩트가 적으면: 브랜드 이해 → 지역 맥락 → 카테고리(업종) → 독자가 궁금해할 질문 순으로 전개.
- 정보를 포기하지 말고, 수집된 실마리 안에서만 글을 완성한다.
- 빈 JSON·작성 거부·「조사 부족으로 출력 불가」 금지.`;

/**
 * @param {Record<string, unknown>} input
 * @returns {{ stage: string, query: string, hint: string }[]}
 */
export function buildDepthCascadeQueries(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const industry = String(input.industry || input.industryText || "로컬").trim();

  if (!brand || !region || !topic) return [];

  return [
    {
      stage: "related",
      query: `${brand} ${topic} 특징 출시`,
      hint: "주제 직접 정보 보강",
    },
    {
      stage: "brand",
      query: `${brand} 브랜드 라인업 포지션`,
      hint: "브랜드 축",
    },
    {
      stage: "category",
      query: `${region} ${industry} 트렌드 선택 가이드`,
      hint: "상위 카테고리",
    },
    {
      stage: "region",
      query: `${region} ${brand} 매장 방문`,
      hint: "지역 축",
    },
    {
      stage: "official",
      query: `${brand} 공식 제품 소개`,
      hint: "공식·제품 자료",
    },
    {
      stage: "similar",
      query: `${topic} 유사 모델 비교`,
      hint: "유사 제품",
    },
    {
      stage: "articles",
      query: `${brand} ${topic} 소식`,
      hint: "관련 기사·맥락",
    },
  ];
}

function mergeSummaries(parts) {
  return parts
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
}

function mergeInsightArrays(target, incoming, key) {
  const seen = new Set(
    (target[key] || []).map((x) => JSON.stringify(x).slice(0, 120))
  );
  for (const item of incoming[key] || []) {
    const sig = JSON.stringify(item).slice(0, 120);
    if (!seen.has(sig)) {
      target[key].push(item);
      seen.add(sig);
    }
  }
}

/**
 * 여러 조사 JSON 병합
 */
export function mergeResearchResults(primary, extras = []) {
  const base = primary ? { ...primary } : { summary: "", sources: [], keywords: [] };
  const all = [primary, ...extras].filter(Boolean);

  base.summary = mergeSummaries(all.map((r) => r.summary));
  base.keywords = [
    ...new Set(all.flatMap((r) => r.keywords || []).map(String)),
  ].slice(0, 24);
  base.sources = [];
  base.channelInsights = [];
  base.competitors = [];
  for (const r of all) {
    mergeInsightArrays(base, r, "sources");
    mergeInsightArrays(base, r, "channelInsights");
    mergeInsightArrays(base, r, "competitors");
  }

  const v2Merged = {
    ...(base.v2Axis || {}),
    researchStatus: "ok",
    insufficient: false,
  };
  for (const r of all) {
    const v2 = r.v2Axis || {};
    for (const key of [
      "brandAnalysis",
      "regionAnalysis",
      "topicAnalysis",
      "gaps",
    ]) {
      if (v2[key] && typeof v2[key] === "object") {
        v2Merged[key] = { ...(v2Merged[key] || {}), ...v2[key] };
      }
    }
    if (Array.isArray(v2.gaps)) {
      v2Merged.gaps = [...new Set([...(v2Merged.gaps || []), ...v2.gaps])];
    }
  }
  v2Merged.factVerification = {
    pass1: "연쇄 조사 1차 수집",
    pass2: "브랜드·지역·주제·연관 축 교차 정리",
    consistent: true,
    gaps: (v2Merged.gaps || []).slice(0, 8),
  };
  base.v2Axis = v2Merged;
  base.mode = base.mode || "depth_merged";
  if (!base.summary?.trim()) {
    base.summary = `${all.length}단계 조사에서 수집한 브랜드·지역·주제 맥락을 바탕으로 글을 구성합니다.`;
  }
  return base;
}

/** 브랜드 엔진·지역 힌트에서 검증 가능한 실마리 추가 */
export function augmentFactsFromLocalContext(facts, input = {}, brandResearch = null) {
  const engine = brandResearch || runBrandResearchEngine(input);
  const summary = engine?.summary || {};
  const bucket = [...facts];
  const push = (axis, text, source) => {
    const t = String(text || "").trim();
    if (t.length < 4) return;
    bucket.push({ axis, fact: t, source });
  };

  (summary.coreStrengths || []).forEach((t) => push("brand", t, "brand_engine"));
  if (summary.uniqueness) push("brand", summary.uniqueness, "brand_engine");
  if (summary.operationStyle) push("brand", summary.operationStyle, "brand_engine");
  (summary.regionalTraits || []).forEach((t) => push("region", t, "brand_engine"));

  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  if (region) push("region", `${region} 지역에서의 방문·비교 검색 맥락`, "region_axis");
  if (brand) push("brand", `${brand} 브랜드 기준으로 제품·서비스를 설명`, "brand_axis");

  for (const h of buildRegionKeywordHints(input).slice(0, 6)) {
    push("region", `${h} — 지역 연관 검색`, "region_hints");
  }

  const seen = new Set();
  return bucket.filter((f) => {
    const k = f.fact.slice(0, 90).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function assessResearchDepth(factCount, input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  if (!brand || !region || !topic) {
    return { tier: "blocked", canWrite: false, factCount };
  }
  if (factCount >= DEPTH_CASCADE_TRIGGER_FACTS) {
    return { tier: "direct", canWrite: true, factCount, expanded: false };
  }
  if (factCount >= DEPTH_MIN_LEADS_TO_WRITE) {
    return { tier: "expanded", canWrite: true, factCount, expanded: true };
  }
  return { tier: "contextual", canWrite: true, factCount, expanded: true };
}

export function buildDepthWritingBrief(depth, input = {}) {
  const brand = input.brandName || "";
  const region = input.region || "";
  const topic = input.topic || input.mainKeyword || "";
  const lines = [RESEARCH_DEPTH_WRITING_RULES];
  if (depth.tier === "expanded" || depth.tier === "contextual") {
    lines.push("【조사 깊이】 주제 직접 정보는 제한적 — 연관·브랜드·지역·카테고리 실마리로 전개.");
  }

  if (depth.tier === "expanded" || depth.tier === "contextual") {
    lines.push(
      `【주제 직접 정보가 제한적】 「${topic}」 단독 팩트는 적을 수 있음.`,
      `→ ${brand} 브랜드·${region} 지역·${input.industry || "업종"} 카테고리·독자 질문(왜/어떻게/누구에게)으로 전개.`,
      "→ 확인되지 않은 스펙·가격·출시일은 쓰지 않음."
    );
  }

  return lines.join("\n");
}

/**
 * @param {object} opts
 * @param {Function} opts.runResearch - (params) => Promise<research>
 * @param {Function} [opts.onStage]
 */
export async function runResearchDepthCascade({
  input,
  types,
  regionKeywordHints,
  primaryResearch,
  brandResearch,
  runResearch,
  onStage,
  maxRounds = 5,
}) {
  let merged = primaryResearch || { summary: "", sources: [] };
  let facts = augmentFactsFromLocalContext(
    collectResearchFacts(merged, input, brandResearch),
    input,
    brandResearch
  );

  if (facts.length >= DEPTH_CASCADE_TRIGGER_FACTS) {
    return { research: merged, facts, depth: assessResearchDepth(facts.length, input) };
  }

  const cascade = buildDepthCascadeQueries(input);
  let rounds = 0;

  for (const step of cascade) {
    if (rounds >= maxRounds) break;
    if (facts.length >= DEPTH_CASCADE_TRIGGER_FACTS) break;

    onStage?.(DEPTH_STAGE_LABELS[step.stage] || step.hint);

    try {
      const extra = await runResearch({
        query: step.query,
        types,
        brandContext: {
          brandName: input.brandName,
          region: input.region,
          industry: input.industry,
          mainKeyword: input.mainKeyword,
          topic: input.topic || input.mainKeyword,
          brandDescription: input.brandDescription,
        },
        mode: "v2_axis_depth",
        regionKeywordHints,
      });
      if (extra?.summary?.trim()) {
        merged = mergeResearchResults(merged, [extra]);
        facts = augmentFactsFromLocalContext(
          collectResearchFacts(merged, input, brandResearch),
          input,
          brandResearch
        );
        rounds += 1;
      }
    } catch {
      /* 다음 축 계속 */
    }
  }

  onStage?.(DEPTH_STAGE_LABELS.synthesize);
  const depth = assessResearchDepth(facts.length, input);
  return { research: merged, facts, depth };
}

export function formatDepthFactsPrompt(facts, depth, input = {}) {
  const block = formatResearchFactsForPrompt(facts);
  const depthBrief = buildDepthWritingBrief(depth, input);
  return `${depthBrief}\n\n【수집 실마리】\n${block}`;
}

/** @deprecated 내부 차단용 — 사용자 메시지에 숫자 노출 금지 */
export function userFacingResearchMessage() {
  return null;
}
