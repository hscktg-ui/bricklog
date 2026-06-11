/**
 * Mission Prose Gate — LLM 초안·폴백 공통 후처리 (Human Story · 체크리스트 · 지역 lock · tier)
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  finalizeMissionProsePack,
  polishMissionProsePack,
} from "@/lib/product/missionProseEngine";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyBrandContentEngine } from "@/lib/content/brandContentEngine";
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { deepenDensityFirstPack } from "@/lib/product/missionProseEngine";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import { buildResearchFactLines } from "@/lib/content/researchGroundedHumanPack";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyMissionProseGate(pack, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  if (shouldPreserveGpt55LlmPackBody(pack, input)) return pack;
  const next = polishMissionProsePack(pack, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      missionProseGate: true,
    },
  };
}

/**
 * LLM·GPT 초안 — tier min 미달 시 flavor 보강 (generic informationExpansion 대체)
 * @param {object} pack
 * @param {object} ctx
 */
export function ensureMissionProseTierLength(pack, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  const mode = String(pack?._meta?.generationMode || "");
  const llmPack =
    pack?._meta?.llmGenerated === true ||
    mode.startsWith("llm_") ||
    pack?._meta?.briclogWriterEngine;
  if (isGpt55WriterDominant() && llmPack) return pack;
  const input = ctx.input || ctx;
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const before = countBlogBodyCharsWithSpaces(pack);
  if (shouldSuppressLengthTopoff(pack, input)) {
    if (before < tier.min) {
      const researchLines = hasUsableResearchFacts(input)
        ? buildResearchFactLines(input, 12)
        : [];
      let next = deepenMissionProseToMin(pack, tier.min, input);
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        let round = 0;
        while (countBlogBodyCharsWithSpaces(next) < tier.min && round < 6) {
          next = deepenDensityFirstPack(next, tier.min, input, {
            polishAfter: true,
            seedOffset: round + 2,
            researchLines,
          });
          round += 1;
        }
      }
      if (
        countBlogBodyCharsWithSpaces(next) < tier.min &&
        hasUsableResearchFacts({ ...input, input })
      ) {
        const grounded = buildResearchGroundedHumanPack({
          ...input,
          blogLengthTier: input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER,
        });
        if (countBlogBodyCharsWithSpaces(grounded) > countBlogBodyCharsWithSpaces(next)) {
          next = {
            ...grounded,
            title: pack.title || grounded.title,
            representativeTitle: pack.representativeTitle || grounded.representativeTitle,
            titles: pack.titles?.length ? pack.titles : grounded.titles,
          };
        }
      }
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        const coverageInput = {
          ...input,
          _salvageForce: true,
          knowledgeCoverage:
            input.knowledgeCoverage || buildKnowledgeCoverageMap({ input, ...input }),
        };
        next = deepenPackBodiesToMin(next, tier.min, coverageInput, coverageInput);
      }
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        next = applyHumanityFinishPass(next, { input }, "blog");
      }
      next = applyBrandContentEngine(next, { input }, input);
      const after = countBlogBodyCharsWithSpaces(next);
      if (after > before) {
        return {
          ...next,
          _meta: {
            ...(next._meta || {}),
            densityFirst: true,
            missionProseTierRefill: true,
            missionProseFallback: true,
            deliveryRescue: true,
            missionProseTierOk: after >= tier.min,
            missionProseChars: after,
            lengthTierMet: after >= tier.min,
            lengthTierSkipped:
              after >= tier.min ? "density_first_refilled" : "density_first_partial",
          },
        };
      }
    }
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        densityFirst: true,
        missionProseTierOk: before >= tier.min,
        missionProseChars: before,
        lengthTierMet: before >= tier.min,
        lengthTierSkipped: "density_first",
      },
    };
  }
  if (before >= tier.min) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        missionProseTierOk: true,
        missionProseChars: before,
        lengthTierMet: pack._meta?.lengthTierMet ?? true,
      },
    };
  }

  let next = applyMissionProseGate(pack, { input });
  next = finalizeMissionProsePack(next, input, tier);
  let after = countBlogBodyCharsWithSpaces(next);
  for (let i = 0; i < 2 && after < tier.min; i += 1) {
    next = finalizeMissionProsePack(next, input, tier);
    after = countBlogBodyCharsWithSpaces(next);
  }
  if (after < tier.min) {
    next = applyHumanityFinishPass(next, { input }, "blog");
    after = countBlogBodyCharsWithSpaces(next);
  }
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      missionProseTierRefill: true,
      missionProseFallback: true,
      deliveryRescue: true,
      missionProseTierOk: after >= tier.min,
      missionProseChars: after,
      lengthTierMet: after >= tier.min,
      lengthTierTarget: tier.min,
    },
  };
}
