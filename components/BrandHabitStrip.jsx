"use client";

import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { useBrandHabitMemory } from "@/lib/hooks/useBrandHabitMemory";
import {
  BRAND_HABIT_HEADLINE,
  formatBrandHabitActivityMeta,
  resolveBrandHabitStatusLine,
} from "@/lib/brands/brandHabitUx";

export default function BrandHabitStrip({ className = "", dnaLabels = null }) {
  const {
    activeBrand,
    learned,
    pendingNote,
    saveLabel,
    learningActive,
    counts,
  } = useBrandHabitMemory();

  if (!activeBrand) return null;

  const habits = formatBrandHabitsBrief(activeBrand);
  const line = resolveBrandHabitStatusLine({
    habitsBrief: habits,
    serverBrief: learned?.brief,
    learningActive,
    pendingNote,
  });
  const activityMeta = formatBrandHabitActivityMeta(counts);
  const continuity = learned?.continuityCopy || "";
  const footnote = [
    saveLabel,
    activityMeta,
    learningActive ? "자동 반영" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-gradient-to-br from-white to-[#F7FBF8] px-3 py-2.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#191F28]">
          {BRAND_HABIT_HEADLINE}
        </p>
        {learningActive ? (
          <span className="shrink-0 rounded-full bg-[#E8F9EF] px-2 py-0.5 text-[10px] font-semibold text-[#03A94D]">
            ON
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">{line}</p>
      {Array.isArray(dnaLabels?.labels) && dnaLabels.labels.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {dnaLabels.labels.slice(0, 6).map((d) => (
            <li
              key={d.id}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                d.avoid ? "bg-[#FFF1F0] text-[#D14343]" : "bg-[#F2F4F6] text-[#4E5968]"
              }`}
            >
              {d.label}
            </li>
          ))}
        </ul>
      ) : null}
      {continuity ? (
        <p className="mt-1 text-[11px] font-medium text-[#03A94D]">
          {continuity}
        </p>
      ) : null}
      {footnote ? (
        <p className="mt-1 text-[10px] text-[#8B95A1]">{footnote}</p>
      ) : null}
      {learned?.feedbackTablesReady === false ? (
        <p className="mt-1 text-[10px] text-[#8B95A1]">
          클라우드 학습은 베타 준비 중 · 톤·금지어는 이 기기에 자동 저장됩니다.
        </p>
      ) : null}
    </div>
  );
}
