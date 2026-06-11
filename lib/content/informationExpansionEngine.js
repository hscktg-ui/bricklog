/**
 * CRITICAL — Information Expansion via Knowledge Coverage (섹션 복제·번호 증가 금지)
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { computeTextSimilarity } from "@/lib/duplicate/contentSimilarity";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import {
  isSubstantiveSectionBody,
} from "@/lib/content/sectionWriterBodies";
import {
  resolvePublishHeading,
  sanitizeBlogPackPlannerLeak,
} from "@/lib/content/sectionPlannerSanitize";
import {
  buildKnowledgeCoverageMap,
  buildCoverageAreaBody,
  getUncoveredCoverageAreas,
  scoreCoverageInPack,
  normalizeHeadingKey,
} from "@/lib/content/knowledgeCoverageEngine";
import { applyKnowledgeCoverageGate } from "@/lib/content/knowledgeCoverageGate";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import {
  assessInformationExpansionCapacity,
} from "@/lib/content/knowledgeExpansionEngine";
import { isCoverageExpansionForbidden } from "@/lib/product/missionFlags";
import { buildStoryTargetSceneLines } from "@/lib/product/storyTargetEngine";
import {
  detectPlaceReviewLeak,
  stripPlaceReviewSentences,
} from "@/lib/channel/smartPlaceNoticeGuard";

function lineAlreadyInText(line, text) {
  const s = String(line || "").trim();
  if (!s || s.length < 8) return false;
  const hay = String(text || "");
  if (hay.includes(s.slice(0, 40))) return true;
  return computeTextSimilarity(s, hay) >= 85;
}

function buildPlaceExpansionLine(input = {}, guard = 0) {
  const brand = String(input.brandName || "").trim();
  const pads = [
    input.placeOffer ? String(input.placeOffer).trim() : "",
    input.placePeriod ? `기간: ${String(input.placePeriod).trim()}` : "",
    input.placeKeyFacts || input.placeDetailHint
      ? String(input.placeKeyFacts || input.placeDetailHint).trim()
      : "",
    brand ? `${brand} — 예약·문의는 플레이스·전화로 확인해 주세요.` : "",
    "운영·이용 시간은 매장·시기마다 달라질 수 있습니다.",
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  return pads[guard % Math.max(1, pads.length)] || "";
}

function buildInstagramExpansionLines(input = {}, count = 4) {
  return buildStoryTargetSceneLines(input, count, "instagram").filter(Boolean);
}

const TIER_MAX_SECTIONS = { short: 9, medium: 12, long: 14 };

function tierMaxSections(input = {}) {
  const key = input.blogLengthTier || "medium";
  return TIER_MAX_SECTIONS[key] || TIER_MAX_SECTIONS.medium;
}

function isTooSimilarToExisting(candidate, pack, threshold = 88) {
  if (!candidate?.trim()) return false;
  const sections = pack?.sections || [];
  if (!sections.length) return false;
  for (const sec of sections) {
    const body = String(sec.body || "").trim();
    if (!body) continue;
    if (body.includes(candidate.slice(0, 40))) return true;
    if (computeTextSimilarity(candidate, body) >= threshold) return true;
  }
  return false;
}

function existingBodiesText(pack) {
  return (pack.sections || []).map((s) => String(s.body || "")).join("\n\n");
}

function tryAddCoverageSection(next, area, input, usedAreaIds, usedHeadings, depth = 0) {
  if (usedAreaIds.has(area.id)) return next;
  const body = buildCoverageAreaBody(area, input, depth).trim();
  if (!isSubstantiveSectionBody(body)) return next;
  return appendCoverageSection(next, area, body, usedAreaIds, usedHeadings);
}

function appendCoverageSection(next, area, body, usedAreaIds, usedHeadings) {
  const heading = resolvePublishHeading(area.heading || area.label, usedHeadings);
  if (!heading) return next;
  usedAreaIds.add(area.id);

  return {
    ...next,
    sections: [...(next.sections || []), { heading, body }],
  };
}

function expandBlogPackByInformation(pack, ctx, input, minChars) {
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap({ ...ctx, ...input });
  let next = sanitizeBlogPackPlannerLeak({
    ...pack,
    sections: (pack.sections || []).filter((s) => isSubstantiveSectionBody(s.body)),
  });

  const usedAreaIds = new Set();
  const usedHeadings = new Set();
  for (const sec of next.sections) {
    const key = normalizeHeadingKey(sec.heading);
    if (key) usedHeadings.add(key);
  }

  for (const area of coverage.areas) {
    if ((next.sections || []).length >= tierMaxSections(input)) break;
    if (usedAreaIds.has(area.id)) continue;
    next = tryAddCoverageSection(next, area, { ...ctx, ...input, knowledgeCoverage: coverage }, usedAreaIds, usedHeadings, 0);
  }

  let guard = 0;
  while (
    countBlogBodyCharsWithSpaces(next) < minChars &&
    guard < coverage.areas.length * 2 &&
    (next.sections || []).length < tierMaxSections(input)
  ) {
    const uncovered = getUncoveredCoverageAreas(coverage, next).filter((a) => !usedAreaIds.has(a.id));
    const area = uncovered[guard % Math.max(1, uncovered.length)];
    if (!area) break;
    const before = countBlogBodyCharsWithSpaces(next);
    next = tryAddCoverageSection(
      next,
      area,
      { ...ctx, ...input, knowledgeCoverage: coverage },
      usedAreaIds,
      usedHeadings,
      guard % 5
    );
    if (countBlogBodyCharsWithSpaces(next) <= before) {
      guard += 1;
      continue;
    }
    guard += 1;
  }

  if (countBlogBodyCharsWithSpaces(next) < minChars) {
    const mergedCtx = { ...ctx, ...input, knowledgeCoverage: coverage };
    const capacity = assessInformationExpansionCapacity(next, mergedCtx, minChars);
    if (capacity.canExpand) {
      next = deepenPackBodiesToMin(next, minChars, ctx, mergedCtx);
    }
    if (countBlogBodyCharsWithSpaces(next) < minChars && capacity.canExpand) {
      let depthGuard = 0;
      while (
        countBlogBodyCharsWithSpaces(next) < minChars &&
        depthGuard < coverage.areas.length * 3
      ) {
        next = deepenPackBodiesToMin(next, minChars, ctx, {
          ...mergedCtx,
          _depthPass: depthGuard,
        });
        depthGuard += 1;
      }
    }
    if (countBlogBodyCharsWithSpaces(next) < minChars) {
      const retry = assessInformationExpansionCapacity(next, mergedCtx, minChars);
      if (!retry.canExpand) {
        return {
          ...next,
          _meta: {
            ...(next._meta || {}),
            knowledgeExpansionBlocked: {
              reason: retry.reason || capacity.reason,
              userMessage: retry.userMessage || capacity.userMessage,
            },
            blocked: true,
            passOutput: false,
          },
        };
      }
      next = deepenPackBodiesToMin(next, minChars, ctx, mergedCtx);
    }
  }

  if (countBlogBodyCharsWithSpaces(next) >= minChars) {
    const { knowledgeExpansionBlocked, blocked, ...restMeta } = next._meta || {};
    next = {
      ...next,
      _meta: {
        ...restMeta,
        passOutput: next._meta?.passOutput ?? true,
        infoExpansionDepth: true,
      },
    };
  }

  next = applyKnowledgeCoverageGate(next, { ...ctx, input: { ...input, knowledgeCoverage: coverage } }, "blog");
  next = sanitizeBlogPackPlannerLeak(next);

  const covScore = scoreCoverageInPack(coverage, next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      infoExpansion: true,
      knowledgeCoverage: {
        total: coverage.coverageCount,
        covered: covScore.covered.length,
        ratio: covScore.ratio,
      },
    },
  };
}

function expandPlaceByInformation(pack, ctx, input, minChars) {
  let detail = stripPlaceReviewSentences(String(pack.detailBody || "").trim());
  let guard = 0;
  while (detail.replace(/\s/g, "").length < minChars && guard < 8) {
    const line = buildPlaceExpansionLine({ ...ctx, ...input }, guard);
    guard += 1;
    if (!line || detectPlaceReviewLeak(line) || lineAlreadyInText(line, detail)) continue;
    detail = `${detail}\n\n${line}`.trim();
  }
  detail = stripPlaceReviewSentences(detail);
  return { ...pack, detailBody: detail, body: [pack.shortNotice, detail].filter(Boolean).join("\n\n") };
}

function expandInstagramByInformation(pack, ctx, input, minLen = 180) {
  const field = pack.lineBreakBody ? "lineBreakBody" : "body";
  let text = String(pack[field] || "").trim();
  const lines = buildInstagramExpansionLines({ ...ctx, ...input }, 6);
  let guard = 0;
  while (text.replace(/\s/g, "").length < minLen && guard < lines.length + 2) {
    const line = lines[guard] || buildInstagramExpansionLines({ ...ctx, ...input }, 2)[0];
    guard += 1;
    if (!line || /결론보다|알아보시다|정리하면/.test(line) || lineAlreadyInText(line, text)) {
      continue;
    }
    text = `${text}\n\n${line}`.trim();
  }
  return { ...pack, [field]: text, body: pack.body || text };
}

export function expandPackByInformation(pack, ctx = {}, input = {}, opts = {}) {
  if (!pack) return pack;
  const channel = opts.channel || "blog";
  const minChars = opts.minChars ?? 1800;
  const bodyChars =
    channel === "blog" ? countBlogBodyCharsWithSpaces(pack) : 0;
  const salvageForce =
    opts.salvageForce === true && channel === "blog" && bodyChars < minChars;
  if (isCoverageExpansionForbidden() && !salvageForce) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        coverageExpansionSkipped: true,
        missionEditorialMode: true,
      },
    };
  }
  const enrichedInput = {
    ...input,
    _salvageForce: salvageForce || input._salvageForce,
    knowledgeCoverage:
      input.knowledgeCoverage ||
      ctx.knowledgeCoverage ||
      buildKnowledgeCoverageMap({ ...ctx, ...input }),
  };

  let next = pack;
  if (channel === "blog") {
    next = expandBlogPackByInformation(pack, ctx, enrichedInput, minChars);
  } else if (channel === "place") {
    next = expandPlaceByInformation(pack, ctx, enrichedInput, Math.min(minChars, 380));
  } else if (channel === "instagram") {
    next = expandInstagramByInformation(pack, ctx, enrichedInput, 200);
  }

  next = applyDuplicateKiller(next, { ...ctx, input: enrichedInput }, channel);
  if (channel === "blog") {
    next = applyKnowledgeCoverageGate(next, { ...ctx, input: enrichedInput }, "blog");
    next = sanitizeBlogPackPlannerLeak(next);
    next = sanitizeVerbatimTopicInPack(next, enrichedInput, "blog");
  }
  return next;
}

export function expandToMinByInformation(pack, minChars, ctx, input, channel = "blog") {
  return expandPackByInformation(pack, ctx, input, { minChars, channel });
}
