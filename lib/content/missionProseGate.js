/**
 * Mission Prose Gate — LLM 초안·폴백 공통 후처리 (Human Story · 체크리스트 · 지역 lock · tier)
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  finalizeMissionProsePack,
  polishMissionProsePack,
} from "@/lib/product/missionProseEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyBrandContentEngine } from "@/lib/content/brandContentEngine";
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyMissionProseGate(pack, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
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
  const input = ctx.input || ctx;
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const before = countBlogBodyCharsWithSpaces(pack);
  if (shouldSuppressLengthTopoff(pack, input)) {
    if (before < tier.min) {
      let next = deepenMissionProseToMin(pack, tier.min, input);
      if (
        countBlogBodyCharsWithSpaces(next) < tier.min &&
        hasUsableResearchFacts({ ...input, input })
      ) {
        next = buildResearchGroundedHumanPack({
          ...input,
          blogLengthTier: input.blogLengthTier || "medium",
        });
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
      missionProseTierOk: after >= tier.min,
      missionProseChars: after,
      lengthTierMet: after >= tier.min,
      lengthTierTarget: tier.min,
    },
  };
}
