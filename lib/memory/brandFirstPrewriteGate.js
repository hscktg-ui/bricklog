import { loadBrandMemoryBundle } from "@/lib/memory/personalizationBrief";
import {
  buildStyleAnchorsFromContentItems,
  buildStyleAnchorBrief,
} from "@/lib/memory/styleAnchorEngine";
import { isBrandFirstEngineEnabled, isStrictBrandGuardEnabled } from "@/lib/config/brandEngineFlags";
import { buildStructureArchivesFromItems } from "@/lib/content/structureVarietyGate";

const APPROVED_CONTENT_LIMIT = 6;
const APPROVED_CONTENT_MIN_QUALITY = 90;

function summarizeApprovedContent(items = [], styleAnchors = []) {
  if (!items.length && !styleAnchors.length) return "";
  const lines = styleAnchors.length
    ? styleAnchors.map((a, idx) => {
        const title = a.title || "승인본";
        return `${idx + 1}. ${title} — "${a.snippet}"`;
      })
    : items.slice(0, APPROVED_CONTENT_LIMIT).map((it, idx) => {
        const title = String(it.title || "").trim() || "제목 없음";
        const quality =
          typeof it.quality_score === "number" ? ` · 품질 ${it.quality_score}` : "";
        return `${idx + 1}. ${title}${quality}`;
      });
  return `최근 승인 콘텐츠 · 톤 앵커 (문장 복사 금지):\n${lines.join("\n")}`.slice(
    0,
    2000
  );
}

function buildPhilosophyBrief(personalization, approvedSummary) {
  return [
    personalization?.brandBrief ? `브랜드 철학: ${personalization.brandBrief}` : "",
    personalization?.feedbackBrief
      ? `대표 피드백: ${personalization.feedbackBrief}`
      : "",
    personalization?.styleContinuityBrief
      ? `문체 연속성: ${personalization.styleContinuityBrief}`
      : "",
    approvedSummary,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2400);
}

async function fetchApprovedContentSnapshots(supabase, userId, brandId) {
  if (!brandId) return [];
  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, channel, quality_score, created_at, prompt_input, full_content")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .order("quality_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return [];
  return (data || []).filter((it) => {
    if (typeof it.quality_score !== "number") return true;
    return it.quality_score >= APPROVED_CONTENT_MIN_QUALITY;
  });
}

export async function prepareBrandFirstInput({
  supabase,
  userId,
  input,
}) {
  if (!isBrandFirstEngineEnabled()) {
    return { ok: true, input, personalization: null };
  }

  const nextInput = { ...input };
  const hasBrandScope = Boolean(nextInput.brandId || nextInput.brandMemory);
  if (!hasBrandScope) {
    return { ok: true, input: nextInput, personalization: null };
  }

  const personalization = await loadBrandMemoryBundle(
    supabase,
    userId,
    nextInput.brandId,
    {
      localBrandMemory: nextInput.brandMemory,
      researchStorage: nextInput.researchStorage || null,
    }
  );

  const approvedItems = await fetchApprovedContentSnapshots(
    supabase,
    userId,
    nextInput.brandId
  );
  const styleAnchors = buildStyleAnchorsFromContentItems(approvedItems);
  const approvedSummary = summarizeApprovedContent(approvedItems, styleAnchors);
  const styleAnchorBrief = buildStyleAnchorBrief({
    styleAnchors,
    brandApprovedContentBrief: approvedSummary,
    styleContinuityBrief: personalization.styleContinuityBrief,
    brandFeedbackBrief: personalization.feedbackBrief,
  });
  const philosophyBrief = buildPhilosophyBrief(personalization, approvedSummary);

  nextInput.accountBrief = personalization.accountBrief;
  nextInput.userWritingBrief = personalization.userBrief;
  nextInput.brandFeedbackBrief = personalization.feedbackBrief;
  nextInput.styleContinuityBrief = personalization.styleContinuityBrief;
  nextInput.brandKnowledgeBrief = personalization.brandKnowledgeBrief;
  nextInput.brandApprovedContentBrief = approvedSummary;
  nextInput.styleAnchors = styleAnchors;
  nextInput.styleAnchorBrief = styleAnchorBrief;
  nextInput.approvedContentCount = approvedItems.length;
  nextInput.pastContentCount = approvedItems.length;
  nextInput.approvedContentItems = approvedItems;
  nextInput.recentStructureArchives = buildStructureArchivesFromItems(approvedItems);
  nextInput.brandPhilosophyBrief = philosophyBrief;
  if (personalization.brandBrief) {
    nextInput.brandHabitsBrief = personalization.brandBrief;
  }
  nextInput.personalizationAddon = personalization.combinedPromptAddon;
  nextInput.combinedPersonalizationAddon = personalization.combinedPromptAddon;

  const strict = isStrictBrandGuardEnabled();
  if (strict && nextInput.brandId && !String(nextInput.combinedPersonalizationAddon || "").trim()) {
    return {
      ok: false,
      reason: "brand_memory_missing",
      userMessage:
        "브랜드 기억을 불러오지 못해 생성을 진행할 수 없습니다. 브랜드 정보를 다시 확인해 주세요.",
      input: nextInput,
      personalization,
    };
  }

  return {
    ok: true,
    input: nextInput,
    personalization: {
      ...personalization,
      approvedContentCount: approvedItems.length,
      styleAnchors,
      styleAnchorBrief,
      approvedContentBrief: approvedSummary,
      brandPhilosophyBrief: philosophyBrief,
    },
  };
}
