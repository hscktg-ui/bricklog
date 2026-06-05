/**
 * 글자수 부족 시 — 기존 섹션 본문 깊이 확장 (섹션·번호 복제 없음)
 */
import { countBlogBodyCharsWithSpaces, koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import {
  buildKnowledgeCoverageMap,
  buildCoverageAreaBody,
} from "@/lib/content/knowledgeCoverageEngine";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { stripEditorAuditSentences } from "@/lib/content/editorQualityEngine";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import { computeTextSimilarity } from "@/lib/duplicate/contentSimilarity";
import { isCoverageExpansionForbidden } from "@/lib/product/missionFlags";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";

function cleanPara(text) {
  return stripEditorAuditSentences(stripMetaLayerTerms(String(text || "").trim()));
}

function mergedInput(ctx, input) {
  return { ...ctx, ...input };
}

/** coverage 영역별 depth 변형 본문 — 단일 문장 분할 금지(100자·3문장 필터 회피) */
function coverageBodyChunks(area, ctx, input, depth, count = 14) {
  const merged = mergedInput(ctx, input);
  const chunks = [];
  const seen = new Set();
  for (let d = 0; d < count; d += 1) {
    const body = cleanPara(buildCoverageAreaBody(area, merged, depth + d));
    const n = body.replace(/\s/g, "").length;
    if (n < 80) continue;
    const key = body.replace(/\s/g, "").slice(0, 64);
    if (seen.has(key)) continue;
    seen.add(key);
    chunks.push(body);
  }
  return chunks;
}

function consumerTopicChunks(ctx, input, slot, count = 8) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const facet = topicWritingFacet(input);
  const topicObj = koreanObjectParticle(facet);
  const variants = [
    `${region ? `${region} ` : ""}${brand}에서 ${facet} 관련 비용·일정·예약 방법은 플레이스·전화·공식 안내로 확인하는 것이 가장 정확합니다.`,
    `${facet}를 비교할 때는 가격·조건·이용 절차·사후 지원을 함께 정리해 두면 상담이 빨라집니다.`,
    `${region ? `${region} ` : ""}방문 전 영업 시간·주차·대기·예약 가능 여부를 확인하면 당일 동선이 편합니다.`,
    `행사·혜택이 있다면 기간·대상·적용 조건을 매장에서 들은 대로 메모해 두었어요.`,
    `${brand} ${facet} — 확인되지 않은 할인·재고·구성은 단정하지 말고 직접 문의하세요.`,
    `${topicObj} 결정할 때 예산·일정·이용 목적을 함께 적어 두면 선택이 수월합니다.`,
    `동일 브랜드·업종이라도 지점·시기에 따라 조건이 달라질 수 있으니 최신 정보를 확인하세요.`,
    `${region ? `${region} 생활권에서 ` : ""}${brand} 이용 시 필요한 준비·서류·주의 사항을 미리 보면 좋습니다.`,
    `${facet} 관련 FAQ는 상담 전에 궁금한 항목을 목록으로 정리해 가면 효율적입니다.`,
    `${brand}${region ? ` ${region}` : ""} — ${facet} 안내는 공식·매장 채널 기준으로 최종 확인하세요.`,
  ];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(cleanPara(variants[(slot + i) % variants.length]));
  }
  return out;
}

function isParaTooSimilar(existing, candidate, threshold = 86) {
  if (!candidate?.trim()) return true;
  const blocks = String(existing || "")
    .split(/\n\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  for (const block of blocks) {
    if (computeTextSimilarity(block, candidate) >= threshold) return true;
  }
  if (computeTextSimilarity(existing, candidate) >= threshold) return true;
  return false;
}

function pickNovelParagraph(existing, candidates, threshold = 86) {
  let best = null;
  let bestSim = 101;
  for (const para of candidates) {
    const sim = Math.max(
      computeTextSimilarity(existing, para),
      ...String(existing)
        .split(/\n\n/)
        .map((b) => computeTextSimilarity(b, para))
    );
    if (sim < bestSim) {
      bestSim = sim;
      best = para;
    }
  }
  if (best && bestSim < threshold) return best;
  return null;
}

function appendNovel(existing, candidates, threshold = 86, forceThreshold = 94) {
  const novel = pickNovelParagraph(existing, candidates, threshold);
  if (novel) {
    return `${String(existing || "").trim()}\n\n${novel}`.trim();
  }
  const forced = pickNovelParagraph(existing, candidates, forceThreshold);
  if (forced) {
    return `${String(existing || "").trim()}\n\n${forced}`.trim();
  }
  const fallback = candidates.find((c) => c?.trim());
  if (fallback && !isParaTooSimilar(existing, fallback, forceThreshold)) {
    return `${String(existing || "").trim()}\n\n${fallback}`.trim();
  }
  return existing;
}

/**
 * @param {object} pack
 * @param {number} min
 * @param {object} ctx
 * @param {object} input
 */
export function deepenPackBodiesToMin(pack, min, ctx = {}, input = {}) {
  if (isCoverageExpansionForbidden()) {
    return deepenMissionProseToMin(pack, min, { ...mergedInput(ctx, input), ...input });
  }

  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(mergedInput(ctx, input));
  const sections = [...(pack?.sections || [])];
  if (!sections.length) return pack;

  const gap = Math.max(0, min - countBlogBodyCharsWithSpaces({ ...pack, sections }));
  const maxDepth = Math.max(
    (coverage.areas?.length || 8) * 20,
    Math.ceil(gap / 50) + 40
  );

  let depth = 0;
  while (countBlogBodyCharsWithSpaces({ ...pack, sections }) < min && depth < maxDepth) {
    const area = coverage.areas?.[depth % Math.max(1, coverage.areas?.length || 1)];
    const sec = sections[depth % sections.length];
    const candidates = area
      ? coverageBodyChunks(area, ctx, input, depth + 2)
      : consumerTopicChunks(ctx, input, depth);
    const topicFallback = consumerTopicChunks(ctx, input, depth + 3, 4);
    const mergedCandidates = [...candidates, ...topicFallback];

    if (sec) {
      sec.body = appendNovel(sec.body, mergedCandidates, 84, 93);
    }
    depth += 1;
  }

  let conclusion = cleanPara(pack.conclusion);
  while (countBlogBodyCharsWithSpaces({ ...pack, sections, conclusion }) < min && depth < maxDepth + 24) {
    const area = coverage.areas?.[depth % Math.max(1, coverage.areas?.length || 1)];
    const candidates = area
      ? coverageBodyChunks(area, ctx, input, depth + 4)
      : consumerTopicChunks(ctx, input, depth + 1);
    const next = appendNovel(conclusion, candidates, 84, 93);
    if (next === conclusion) break;
    conclusion = next;
    depth += 1;
  }

  return { ...pack, sections, conclusion };
}
