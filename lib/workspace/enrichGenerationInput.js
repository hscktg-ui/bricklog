/**
 * 생성·다시받기 입력 보강 — 사용자 톤 요청 우선, 브랜드 저장소 습관 2순위
 */
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { shouldMergeWorkspaceBrand } from "@/lib/workspace/brandScopeGuard";

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
};

function buildUserToneBrief(toneRequest = "") {
  const t = String(toneRequest || "").trim();
  if (!t) return "";
  return `사용자 톤 요청: ${t.slice(0, 160)}`;
}

/**
 * @param {object} input
 * @param {{ priorRewriteCount?: number, regenVariation?: number, channel?: string }} genOpts
 */
export function applyRegenVariation(input = {}, genOpts = {}) {
  const channel = genOpts.channel || "blog";
  const variation = Number(genOpts.regenVariation) || Date.now();
  const prior = Number(genOpts.priorRewriteCount ?? input.rewriteCount) || 0;
  const nextCount = prior + 1;
  const label = CHANNEL_LABEL[channel] || CHANNEL_LABEL.blog;
  const regenLine = `【${label} 다시 받기 ${nextCount}회차】이전 결과와 다른 표현·구성. 브랜드 톤·사용자 요청은 유지. 동일 문장·소제목 반복 금지.`;

  const base = {
    ...input,
    regenVariation: variation,
    rewriteCount: nextCount,
    feedbackSeed:
      ((Number(input.feedbackSeed) || 0) + (variation % 11) + nextCount) % 97,
    feedbackRegenDirective: "regen_variation_required",
    feedbackIntentDriven: true,
    brandFeedbackBrief: [input.brandFeedbackBrief, regenLine].filter(Boolean).join(" · "),
  };

  if (channel === "blog") {
    return {
      ...base,
      feedbackHints: [
        ...(Array.isArray(input.feedbackHints) ? input.feedbackHints : []),
        "restructure_sections",
        "add_information_units",
        "expand_explanations",
        "weave_research_facts",
      ],
    };
  }

  return base;
}

/**
 * @param {object} input
 * @param {{ activeBrand?: object, activeBrandId?: string }} [brandHooks]
 * @param {{ regen?: boolean, priorRewriteCount?: number, regenVariation?: number, channel?: string }} [genOpts]
 */
export function enrichGenerationInput(input = {}, brandHooks = {}, genOpts = {}) {
  const brand = brandHooks?.activeBrand || input.brandMemory;
  let next = { ...input };

  const canUseWorkspaceBrand =
    brand?.brandName?.trim() &&
    shouldMergeWorkspaceBrand(next, brand, brandHooks?.activeBrandId);

  if (canUseWorkspaceBrand) {
    if (!next.brandHabitsBrief) {
      const habits = formatBrandHabitsBrief(brand);
      if (habits) next.brandHabitsBrief = habits;
    }
    if (!next.brandMemory) next.brandMemory = brand;
    if (!next.brandId && brandHooks?.activeBrandId) {
      next.brandId = brandHooks.activeBrandId;
    }
  }

  const userToneBrief = buildUserToneBrief(next.toneRequest);
  if (userToneBrief) next.userToneBrief = userToneBrief;

  if (genOpts.regen) {
    next = applyRegenVariation(next, genOpts);
    next.regenDeliveryPolish = true;
    next.forceColumnistSovereignFresh = true;
  }

  if (next.userToneBrief) {
    next.brandFeedbackBrief = [next.brandFeedbackBrief, next.userToneBrief]
      .filter(Boolean)
      .join(" · ");
  }

  return next;
}

export function stampChannelRewriteMeta(pack, rewriteCount = 0) {
  if (!pack || rewriteCount < 1) return pack;
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      rewriteCount,
      regenApplied: true,
    },
  };
}
