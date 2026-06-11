/**
 * 글자수 부족 시 — 기존 섹션 본문 깊이 확장 (섹션·번호 복제 없음)
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  buildKnowledgeCoverageMap,
  buildCoverageAreaBody,
} from "@/lib/content/knowledgeCoverageEngine";
import { stripEditorAuditSentences } from "@/lib/content/editorQualityEngine";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import { computeTextSimilarity } from "@/lib/duplicate/contentSimilarity";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { isCoverageExpansionForbidden } from "@/lib/product/missionFlags";
import { buildTopicAwareConsumerPads } from "@/lib/content/topicAwareLengthPads";
import {
  applyDisplayBodyGuardPack,
  isDisplayBodyForbidden,
} from "@/lib/content/displayBodyGuards";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";

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
    if (isDisplayBodyForbidden(body, merged)) continue;
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
  const merged = { ...ctx, ...input };
  return buildTopicAwareConsumerPads(merged, slot, count)
    .map((line) => cleanPara(line))
    .filter((line) => line && !isDisplayBodyForbidden(line, merged));
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
  const merged = { ...mergedInput(ctx, input), ...input };
  if (isCoverageExpansionForbidden()) {
    return deepenMissionProseToMin(pack, min, merged);
  }

  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(mergedInput(ctx, input));
  const sections = [...(pack?.sections || [])];
  if (!sections.length) return pack;

  const targetMin = merged._salvageForce ? min + 180 : min;
  const gap = Math.max(0, targetMin - countBlogBodyCharsWithSpaces({ ...pack, sections }));
  const maxDepth = Math.max(
    (coverage.areas?.length || 8) * 16,
    Math.ceil(gap / 55) + 32
  );

  let depth = 0;
  while (countBlogBodyCharsWithSpaces({ ...pack, sections }) < targetMin && depth < maxDepth) {
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
  while (
    countBlogBodyCharsWithSpaces({ ...pack, sections, conclusion }) < targetMin &&
    depth < maxDepth + 24
  ) {
    const area = coverage.areas?.[depth % Math.max(1, coverage.areas?.length || 1)];
    const candidates = area
      ? coverageBodyChunks(area, ctx, input, depth + 4)
      : consumerTopicChunks(ctx, input, depth + 1);
    const next = appendNovel(conclusion, candidates, 84, 93);
    if (next === conclusion) break;
    conclusion = next;
    depth += 1;
  }

  let result = weaveTopicDominanceIntoPack(
    { ...pack, sections, conclusion },
    mergedInput(ctx, input)
  );
  const dupCtx = mergedInput(ctx, input);
  result = applyDuplicateKiller(result, dupCtx, "blog");
  result = stripGlobalExactDuplicateSentences(result);

  let chars = countBlogBodyCharsWithSpaces(result);
  if (chars < min && merged._salvageForce) {
    const sectionsRefill = [...(result.sections || [])];
    let refill = 0;
    while (chars < min && refill < 12) {
      const sec = sectionsRefill[refill % sectionsRefill.length];
      if (sec) {
        const pads = consumerTopicChunks(dupCtx, input, refill + depth, 3);
        sec.body = appendNovel(sec.body, pads, 82, 90);
      }
      chars = countBlogBodyCharsWithSpaces({ ...result, sections: sectionsRefill });
      refill += 1;
    }
    result = { ...result, sections: sectionsRefill };
    result = weaveTopicDominanceIntoPack(result, dupCtx);
    result = applyDuplicateKiller(result, dupCtx, "blog");
    result = stripGlobalExactDuplicateSentences(result);
  }

  return {
    ...result,
    _meta: {
      ...(result._meta || {}),
      salvageBodiesDeepened: true,
      lengthTierMet: countBlogBodyCharsWithSpaces(result) >= min,
    },
  };
}

/** salvage·display — coverage 패드 대신 mission prose + display guard */
export function deepenPackForSalvage(pack, min, ctx = {}, input = {}) {
  const merged = { ...mergedInput(ctx, input), ...input };
  if (shouldPreserveGpt55LlmPackBody(pack, merged)) {
    return applyDisplayBodyGuardPack(pack, merged);
  }
  let next = isCoverageExpansionForbidden()
    ? deepenMissionProseToMin(pack, min, merged)
    : deepenPackBodiesToMin(pack, min, { ...ctx, _salvageForce: true }, input);
  next = applyDisplayBodyGuardPack(next, merged);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      salvageDeepen: true,
      lengthTierMet: countBlogBodyCharsWithSpaces(next) >= min,
    },
  };
}
