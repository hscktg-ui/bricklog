"use client";

import { useMemo } from "react";
import {
  getSpeakerTopicGuidance,
  getSpeakerOptionLabel,
} from "@/lib/persona/speakerTopicGuide";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay";
import { buildWorkspaceContextScore } from "@/lib/publicTest/briclogContextScore";
import { buildEditorialReflectionChips } from "@/lib/product/editorialReflectionDisplay";
import BriclogDepthPanel from "@/components/quality/BriclogDepthPanel";

function DetailChip({ warn, children }) {
  const cls = warn
    ? "border-[rgba(255,149,0,0.25)] bg-[rgba(255,149,0,0.08)] text-[var(--vision-ink)]"
    : "border-[var(--vision-line)] bg-white/80 text-[var(--vision-muted)]";
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${cls}`}
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

  const reflectionChips = useMemo(
    () => buildEditorialReflectionChips(draft, blogInput || {}),
    [draft, blogInput]
  );

  return (
    <div className="space-y-3">
      {reflectionChips.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5"
          aria-label="입력 반영 요약"
        >
          {reflectionChips.map((chip) => (
            <span
              key={chip.id}
              className="rounded-full border border-[rgba(48,209,88,0.2)] bg-[rgba(48,209,88,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[var(--vision-ink)]"
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}

      <BriclogDepthPanel
        contextScore={contextScore}
        variant="compact"
        showDepthBadge
        channelReady={{ place: hasPlace, insta: hasInsta }}
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
