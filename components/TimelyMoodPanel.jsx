"use client";

import { useMemo } from "react";
import { getTimelyMoodPack } from "@/lib/season/timelyMoodSamples";
import { getContentCalendar } from "@/lib/calendar/contentCalendar";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function TimelyMoodPanel({
  channel = "blog",
  industryKey = "flower",
  contentDate,
  onContentDateChange,
  includePhrases = "",
  onApplySample,
  onApplyAllSamples,
}) {
  const dateIso = contentDate || todayIso();
  const selectedDate = useMemo(
    () => new Date(`${dateIso}T12:00:00`),
    [dateIso]
  );

  const pack = useMemo(
    () => getTimelyMoodPack(selectedDate, channel),
    [selectedDate, channel]
  );
  const calendar = useMemo(
    () => getContentCalendar(selectedDate.getMonth() + 1, industryKey),
    [selectedDate, industryKey]
  );

  const apply = (text) => {
    const cur = includePhrases?.trim() || "";
    const next = cur ? `${cur}, ${text}` : text;
    onApplySample?.(next);
  };

  return (
    <div className="rounded-2xl border border-[#E8EBED] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#03A94D]">제작 시의성</p>
        <label className="flex items-center gap-1.5 text-[11px] text-[#4E5968]">
          <span>날짜</span>
          <input
            type="date"
            value={dateIso}
            onChange={(e) => onContentDateChange?.(e.target.value || todayIso())}
            className="rounded-md border border-[#E8EBED] px-2 py-1 text-[12px]"
          />
        </label>
      </div>
      <p className="mt-1 text-[15px] font-bold text-[#191F28]">{pack.todayLabel}</p>
      <p className="mt-1 text-[13px] text-[#4E5968]">{pack.moodLine}</p>
      <p className="text-[12px] text-[#8B95A1]">{pack.seasonLine}</p>
      {pack.eventLine && (
        <p className="mt-0.5 text-[12px] font-medium text-[#03A94D]">
          {pack.eventLine}
        </p>
      )}
      <p className="mt-2 text-[11px] text-[#8B95A1]">{pack.channelHint}</p>

      {calendar.all.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-semibold text-[#4E5968]">
            {calendar.month}월 추천 소재
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {calendar.all.map((s) => (
              <button
                key={`cal-${s}`}
                type="button"
                onClick={() => apply(s)}
                className="rounded-full border border-[#D4E8DC] bg-[#F0FAF4] px-3 py-1.5 text-[12px] text-[#03A94D] hover:border-[#03C75A]"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-[12px] font-semibold text-[#4E5968]">
        지금 쓰기 좋은 주제 (탭하여 포함)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pack.samples.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => apply(s)}
            className="rounded-full border border-[#E8EBED] bg-[#F7F8FA] px-3 py-1.5 text-[12px] text-[#4E5968] hover:border-[#03C75A] hover:bg-[#E8F9EF] hover:text-[#03A94D]"
          >
            {s}
          </button>
        ))}
      </div>
      {onApplyAllSamples && (
        <button
          type="button"
          onClick={() => onApplyAllSamples(pack.samples.join(", "))}
          className="mt-3 text-[12px] font-medium text-[#03A94D] hover:underline"
        >
          시의성 키워드 한번에 넣기
        </button>
      )}
    </div>
  );
}
