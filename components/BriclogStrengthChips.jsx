"use client";

import { useMemo } from "react";
import {
  getSpeakerTopicGuidance,
  getSpeakerOptionLabel,
} from "@/lib/persona/speakerTopicGuide";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay";
import { buildWorkspaceContextScore } from "@/lib/publicTest/briclogContextScore";
import BriclogDepthPanel from "@/components/quality/BriclogDepthPanel";

function DetailChip({ warn, children }) {
  const cls = warn
    ? "border-[#FFE0B2] bg-[#FFF8E6] text-[#E67700]"
    : "border-[#E8EBED] bg-white text-[#4E5968]";
  return (
    <span
      className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export default function BriclogStrengthChips({
  draft,
  blogInput = null,
  hasPlace = false,
  hasInsta = false,
}) {
  if (!draft?.sections?.length) return null;

  const contextScore = useMemo(
    () =>
      buildWorkspaceContextScore(draft, blogInput || {}, {
        hasPlace,
        hasInsta,
      }),
    [draft, blogInput, hasPlace, hasInsta]
  );

  const meta = draft._meta || {};
  const guide = getSpeakerTopicGuidance(blogInput || {});
  const speakerLabel = getSpeakerOptionLabel(blogInput?.v4Speaker || "auto");
  const researchBuilt =
    meta.researchGroundedHumanPack ||
    meta.researchFactsWoven ||
    (Array.isArray(blogInput?.researchFacts) &&
      blogInput.researchFacts.length >= 2);

  const feedbackLine =
    meta.feedbackAppliedSummary ||
    (meta.feedbackRewrite
      ? formatFeedbackAppliedCustomerLine(
          meta.feedbackAppliedIntents || blogInput?.feedbackHints,
          blogInput?.feedbackIntentBrief
        )
      : "");

  return (
    <div className="space-y-3">
      <BriclogDepthPanel
        contextScore={contextScore}
        variant="compact"
        showDepthBadge
      />

      <div className="flex flex-wrap gap-2">
        {feedbackLine ? <DetailChip>{feedbackLine}</DetailChip> : null}
        {researchBuilt ? <DetailChip>조사 반영</DetailChip> : null}
        {meta.llmDeliveryPolish ? <DetailChip>AI 원고 마감</DetailChip> : null}
        {meta.briclogWriterEngine ? (
          <DetailChip>
            {meta.writerEngineExpanded ? "GPT 분량 확장" : "Writer Engine"}
          </DetailChip>
        ) : null}
        {typeof meta.haeshinScore === "number" ? (
          <DetailChip>해신 {meta.haeshinScore}</DetailChip>
        ) : null}
        {meta.adaptiveQualityModeLabel ? (
          <DetailChip>{meta.adaptiveQualityModeLabel}</DetailChip>
        ) : null}
        {!guide.alignmentOk ? (
          <DetailChip warn>
            화자 맞춤 · {speakerLabel}
          </DetailChip>
        ) : null}
        {meta.rewriteCount > 0 && !feedbackLine ? (
          <DetailChip>다듬기 {meta.rewriteCount}회 반영</DetailChip>
        ) : null}
      </div>
    </div>
  );
}
