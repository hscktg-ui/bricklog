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
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap({ ...ctx, ...input });
  let detail = String(pack.detailBody || "").trim();
  const used = new Set();
  let guard = 0;
  while (detail.replace(/\s/g, "").length < minChars && guard < coverage.areas.length) {
    const area = coverage.areas[guard % coverage.areas.length];
    if (used.has(area.id)) {
      guard += 1;
      continue;
    }
    const para = buildCoverageAreaBody(area, { ...ctx, ...input }, guard);
    if (isSubstantiveSectionBody(para) && !isTooSimilarToExisting(para, detail, 85)) {
      detail = `${detail}\n\n${para}`.trim();
      used.add(area.id);
    }
    guard += 1;
  }
  return { ...pack, detailBody: detail, body: [pack.shortNotice, detail].filter(Boolean).join("\n\n") };
}

function expandInstagramByInformation(pack, ctx, input, minLen = 180) {
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap({ ...ctx, ...input });
  const field = pack.lineBreakBody ? "lineBreakBody" : "body";
  let text = String(pack[field] || "").trim();
  let guard = 0;
  while (text.replace(/\s/g, "").length < minLen && guard < 8) {
    const area = coverage.areas[guard % coverage.areas.length];
    const line = buildCoverageAreaBody(area, { ...ctx, ...input }, guard)
      .split(/\n\n/)[0]
      ?.trim();
    if (line && !isTooSimilarToExisting(line, text, 88)) {
      text = `${text}\n\n${line}`.trim();
    }
    guard += 1;
  }
  return { ...pack, [field]: text, body: pack.body || text };
}

export function expandPackByInformation(pack, ctx = {}, input = {}, opts = {}) {
  if (!pack) return pack;
  if (isCoverageExpansionForbidden()) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        coverageExpansionSkipped: true,
        missionEditorialMode: true,
      },
    };
  }
  const channel = opts.channel || "blog";
  const minChars = opts.minChars ?? 1800;
  const enrichedInput = {
    ...input,
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
