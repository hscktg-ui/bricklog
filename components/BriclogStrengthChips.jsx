"use client";

import {
  getSpeakerTopicGuidance,
  getSpeakerOptionLabel,
} from "@/lib/persona/speakerTopicGuide";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay";

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

export default function BriclogStrengthChips({ draft, blogInput = null }) {
  if (!draft?.sections?.length) return null;

  const meta = draft._meta || {};
  const readiness = resolvePublishReadiness(draft);
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

  const bannerCls =
    readiness.status === "ready"
      ? "border-[#03C75A]/25 bg-[#E8F9EF] text-[#03A94D]"
      : readiness.status === "polishing"
        ? "border-[#FFE0B2] bg-[#FFF8E6] text-[#E67700]"
        : "border-[#E8EBED] bg-white text-[#4E5968]";

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border px-4 py-3 ${bannerCls}`}
        role="status"
      >
        <p className="text-[13px] font-bold">{readiness.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
          {readiness.hint}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {feedbackLine ? <DetailChip>{feedbackLine}</DetailChip> : null}
        {researchBuilt ? <DetailChip>조사 반영</DetailChip> : null}
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
