/**
 * Brand Memory AI — USER → BRAND → CONTENT → 입력 순서 (프롬프트 브리프)
 */

export const MEMORY_LABELS = {
  user: "【USER MEMORY】",
  brand: "【BRAND MEMORY】",
  content: "【CONTENT MEMORY】",
  input: "【이번 입력】",
};

export function buildContentMemoryBrief({
  feedbackBrief = "",
  styleContinuityBrief = "",
  dataAssetBrief = "",
} = {}) {
  const parts = [];
  if (feedbackBrief) parts.push(`학습·피드백: ${feedbackBrief}`);
  if (styleContinuityBrief) parts.push(`톤 연속: ${styleContinuityBrief}`);
  if (dataAssetBrief) parts.push(String(dataAssetBrief).trim());
  return parts.join("\n").slice(0, 1600);
}

/**
 * @param {object} layers — loadPersonalizationLayers / simulateLayers 반환형
 */
export function buildBrandMemoryBundleFromLayers(layers = {}) {
  const accountLine = layers.accountBrief
    ? `운영 맥락: ${layers.accountBrief}`.slice(0, 200)
    : "";
  const userMemoryBrief = [layers.userBrief, accountLine]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 900);

  const brandMemoryBrief = [layers.brandBrief, layers.brandKnowledgeBrief]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 2000);

  const contentMemoryBrief = buildContentMemoryBrief(layers);

  const combinedPromptAddon = buildBrandMemoryAddon({
    userMemoryBrief,
    brandMemoryBrief,
    contentMemoryBrief,
  });

  return {
    ...layers,
    userMemoryBrief,
    brandMemoryBrief,
    contentMemoryBrief,
    combinedPromptAddon,
  };
}

export function buildBrandMemoryAddon({
  userMemoryBrief = "",
  brandMemoryBrief = "",
  contentMemoryBrief = "",
} = {}) {
  const blocks = [];
  if (userMemoryBrief) {
    blocks.push(`${MEMORY_LABELS.user}\n${userMemoryBrief}`);
  }
  if (brandMemoryBrief) {
    blocks.push(`${MEMORY_LABELS.brand}\n${brandMemoryBrief}`);
  }
  if (contentMemoryBrief) {
    blocks.push(`${MEMORY_LABELS.content}\n${contentMemoryBrief}`);
  }
  return blocks.join("\n\n").slice(0, 3600);
}

/**
 * 블로그 user 프롬프트 — 기억 블록을 【이번 입력】 앞에 둠
 */
/**
 * 향후 Brand Memory 자산에 research 결과를 연결할 때 사용 (Phase 2)
 * @param {ReturnType<typeof import("@/lib/research/buildResearchBrief").serializeResearchForStorage>} stored
 */
export function buildResearchMemoryAddon(stored) {
  if (!stored?.research_result?.summary) return "";
  return `${MEMORY_LABELS.content}\n[조사 기록] ${stored.research_query || ""}\n${stored.research_result.summary}`.slice(
    0,
    1200
  );
}

export function buildBrandMemoryUserSection(ctx = {}) {
  const addon =
    ctx.combinedPromptAddon ||
    ctx.personalizationAddon ||
    buildBrandMemoryAddon({
      userMemoryBrief:
        ctx.userMemoryBrief ||
        [ctx.userWritingBrief, ctx.accountBrief ? `운영: ${ctx.accountBrief}` : ""]
          .filter(Boolean)
          .join(" · "),
      brandMemoryBrief:
        ctx.brandMemoryBrief ||
        [ctx.brandHabitsBrief, ctx.brandKnowledgeBrief].filter(Boolean).join(" · "),
      contentMemoryBrief:
        ctx.contentMemoryBrief ||
        buildContentMemoryBrief({
          feedbackBrief: ctx.brandFeedbackBrief,
          styleContinuityBrief: ctx.styleContinuityBrief,
          dataAssetBrief: ctx.dataAssetBrief,
        }),
    });

  if (!addon?.trim()) return "";
  return `\n\n${addon}\n\n(위 Brand Memory를 반영합니다. 아래는 이번 글의 【이번 입력】입니다.)`;
}
