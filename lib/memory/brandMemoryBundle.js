/**
 * Brand Memory AI — USER → BRAND → CONTENT → 입력 순서 (프롬프트 브리프)
 */
import { buildBrandMemoryPriorityUserHint } from "@/lib/product/brandMemoryPriority";
import { buildStyleAnchorPromptBlock } from "@/lib/memory/styleAnchorEngine";

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
  researchMemoryBrief = "",
} = {}) {
  const parts = [];
  if (feedbackBrief) parts.push(`학습·피드백: ${feedbackBrief}`);
  if (styleContinuityBrief) parts.push(`톤 연속: ${styleContinuityBrief}`);
  if (researchMemoryBrief) parts.push(String(researchMemoryBrief).trim());
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

  const contentMemoryBrief = buildContentMemoryBrief({
    ...layers,
    feedbackBrief: layers.feedbackBrief,
    styleContinuityBrief: layers.styleContinuityBrief,
    dataAssetBrief: layers.dataAssetBrief,
    researchMemoryBrief: layers.researchMemoryBrief,
  });

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
  const philosophyBlock = String(ctx.brandPhilosophyBrief || "").trim();
  const approvedBlock = String(ctx.brandApprovedContentBrief || "").trim();
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

  const styleAnchorBlock = buildStyleAnchorPromptBlock(ctx);
  const memoryBlocks = [
    buildBrandMemoryPriorityUserHint(),
    styleAnchorBlock,
    addon,
    philosophyBlock,
    approvedBlock,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join("\n\n");

  if (!memoryBlocks) return "";
  return `\n\n${memoryBlocks}\n\n【V12】브랜드 작업실·브랜드 기억 최우선 → 공식자료 → 네이버(재료) → Gemini 심층(선택). 외부 검색·AI보다 메모리·공식·과거 콘텐츠·승인본 우선. Google CSE 미사용.\n(아래 【이번 입력】은 이번 글의 핵심 주제·맥락입니다. 매번 처음 소개하는 브랜드 금지 — 연속된 다음 장으로 쓸 것.)`;
}
