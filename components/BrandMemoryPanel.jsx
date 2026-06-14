"use client";

import { useState } from "react";
import { EMOJI_DENSITY_OPTIONS } from "@/lib/emoji/emojiDensityEngine";
import { BLOG_TONE_OPTIONS } from "@/lib/constants";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { useBrandHabitMemory } from "@/lib/hooks/useBrandHabitMemory";
import {
  BRAND_HABIT_HEADLINE,
  BRAND_HABIT_SUBLINE,
  formatBrandHabitActivityMeta,
  resolveBrandHabitStatusLine,
} from "@/lib/brands/brandHabitUx";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2 text-[13px] text-[#191F28] focus:border-[#03C75A] focus:outline-none focus:ring-1 focus:ring-[#03C75A]/30";

export default function BrandMemoryPanel({
  defaultOpen = false,
  summaryLine,
  embedded = false,
}) {
  const [open, setOpen] = useState(defaultOpen || embedded);
  const {
    activeBrand,
    brandDraft,
    learned,
    pendingNote,
    patchField,
    saveLabel,
    learningActive,
    counts,
  } = useBrandHabitMemory();

  if (!activeBrand || !brandDraft) return null;

  const habitsSummary = formatBrandHabitsBrief(brandDraft);
  const statusLine =
    summaryLine ||
    resolveBrandHabitStatusLine({
      habitsBrief: habitsSummary,
      serverBrief: learned?.brief,
      learningActive,
      pendingNote,
    });
  const activityMeta = formatBrandHabitActivityMeta(counts);
  const wrap = embedded ? "" : "border-b border-[#E8EBED] px-3 pb-3";

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-1.5 text-left"
        aria-expanded={open}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-[#191F28]">
            {embedded ? "브랜드 습관" : BRAND_HABIT_HEADLINE}
          </span>
          <span className="shrink-0 text-[11px] font-normal text-[#8B95A1]">
            {open ? "접기" : "맞춤"}
          </span>
        </span>
        {!open && (
          <span className="line-clamp-2 text-[12px] leading-snug text-[#4E5968]">
            {statusLine}
          </span>
        )}
        {!open && (saveLabel || activityMeta) ? (
          <span className="text-[10px] text-[#03A94D]">
            {[saveLabel, activityMeta].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-[#E8EBED] bg-[#F7F8FA] p-3">
          <div className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#03A94D]">
              {learningActive ? "자동 반영 중" : "자동으로 쌓입니다"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
              {statusLine}
            </p>
            {activityMeta ? (
              <p className="mt-1.5 text-[10px] text-[#8B95A1]">{activityMeta}</p>
            ) : null}
            {saveLabel ? (
              <p className="mt-1 text-[10px] font-medium text-[#03A94D]">
                {saveLabel}
              </p>
            ) : null}
          </div>

          <p className="text-[10px] leading-snug text-[#8B95A1]">
            {BRAND_HABIT_SUBLINE}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[10px] font-medium text-[#8B95A1]">
              문체
              <select
                className={`${fieldClass} mt-1`}
                value={brandDraft.tone || "emotional"}
                onChange={(e) => patchField("tone", e.target.value)}
              >
                {BLOG_TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-medium text-[#8B95A1]">
              이모지
              <select
                className={`${fieldClass} mt-1`}
                value={brandDraft.emojiDensity || brandDraft.emojiLevel || "low"}
                onChange={(e) => patchField("emojiDensity", e.target.value)}
              >
                {EMOJI_DENSITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-medium text-[#8B95A1] sm:col-span-2">
              문장 길이
              <select
                className={`${fieldClass} mt-1`}
                value={brandDraft.preferredSentenceStyle || "medium"}
                onChange={(e) =>
                  patchField("preferredSentenceStyle", e.target.value)
                }
              >
                <option value="short">짧게</option>
                <option value="medium">보통</option>
                <option value="long">길게</option>
              </select>
            </label>
            <label className="block text-[10px] font-medium text-[#8B95A1] sm:col-span-2">
              피하고 싶은 표현
              <textarea
                className={`${fieldClass} mt-1 min-h-[52px] resize-y`}
                value={brandDraft.forbiddenWords || ""}
                onChange={(e) => patchField("forbiddenWords", e.target.value)}
                placeholder="예: 무조건, 100% 만족, 소개해드릴게요"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
