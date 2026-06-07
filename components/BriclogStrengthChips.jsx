"use client";

import {
  getSpeakerTopicGuidance,
  getSpeakerOptionLabel,
} from "@/lib/persona/speakerTopicGuide";

function Chip({ ok, warn, children }) {
  const cls = ok
    ? "border-[#03C75A]/20 bg-[#E8F9EF] text-[#03A94D]"
    : warn
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
  const human = meta.humanWritingDelivery;
  const guide = getSpeakerTopicGuidance(blogInput || {});
  const speakerLabel = getSpeakerOptionLabel(blogInput?.v4Speaker || "auto");
  const researchBuilt =
    meta.researchGroundedHumanPack ||
    meta.researchFactsWoven ||
    (Array.isArray(blogInput?.researchFacts) && blogInput.researchFacts.length >= 2);

  return (
    <div className="flex flex-wrap gap-2">
      {researchBuilt ? <Chip ok>조사 반영</Chip> : null}
      <Chip ok={guide.alignmentOk} warn={!guide.alignmentOk}>
        화자 · {speakerLabel}
      </Chip>
      {human?.humanReady === true ? (
        <Chip ok>사람글 준비</Chip>
      ) : human?.humanReady === false ? (
        <Chip warn>사람글 다듬는 중</Chip>
      ) : null}
      {meta.completionReadiness?.displayReady === true ? (
        <Chip ok>편집본 준비</Chip>
      ) : null}
    </div>
  );
}
