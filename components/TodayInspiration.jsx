"use client";

import { useWritingContextHints } from "@/lib/hooks/useWritingContextHints";

export default function TodayInspiration({
  industryKey = "",
  brandType = "other",
  brandName = "",
  contentDate,
  channel = "blog",
  topic = "",
  mainKeyword = "",
  subKeyword = "",
  includePhrases = "",
  onPickTopic,
  onPickScene,
  onQuickWrite,
  canQuickWrite = false,
  compact = false,
  embedded = false,
  selectable = false,
  selected,
  onToggleStory,
}) {
  const pack = useWritingContextHints({
    contentDate,
    industryKey,
    brandName,
    channel,
    topic,
    mainKeyword,
    subKeyword,
    includePhrases,
  });

  const shellClass = embedded
    ? "rounded-xl border border-[#E8EBED] bg-white p-4"
    : `rounded-2xl border border-[#E8EBED] bg-gradient-to-b from-[#FFFBF7] to-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`;

  return (
    <div className={shellClass}>
      {!embedded && (
        <>
          <p className="text-[11px] font-semibold text-[#03A94D]">오늘의 이야기</p>
          <p className="mt-0.5 text-[12px] text-[#8B95A1]">
            {pack.dateLabel} · {pack.seasonLabel}
          </p>
          {pack.brandLine && (
            <p className="mt-1 text-[13px] font-medium text-[#4E5968]">
              {pack.brandLine}
            </p>
          )}
        </>
      )}

      {embedded && (
        <p className="mb-3 text-[11px] text-[#8B95A1]">
          {pack.dateLabel} · {pack.seasonLabel}
          {pack.brandLine ? ` · ${pack.brandLine}` : ""}
        </p>
      )}

      <div className={embedded ? "space-y-2" : "mt-4 space-y-3"}>
        {pack.stories.map((s, i) => (
          <div
            key={`${s.title}-${i}`}
            className={`rounded-xl border px-3 py-2.5 ${
              selectable && selected?.has(i)
                ? "border-[#03C75A] bg-[#E8F9EF]"
                : "border-[#F0EBE3] bg-white"
            }`}
          >
            <div className="flex items-start gap-2">
              {selectable && (
                <input
                  type="checkbox"
                  checked={selected?.has(i) ?? false}
                  onChange={() => onToggleStory?.(i)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#03C75A]"
                  aria-label={`${s.title} 맥락 힌트 선택`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-[#191F28]">
                  {s.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#4E5968]">
                  {s.body}
                </p>
                {(onPickTopic || onQuickWrite) && !selectable && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {onPickTopic && (
                      <button
                        type="button"
                        onClick={() => onPickTopic(s.title)}
                        className="text-[12px] font-medium text-[#4E5968] hover:underline"
                      >
                        주제만 넣기
                      </button>
                    )}
                    {onQuickWrite && (
                      <button
                        type="button"
                        onClick={() => onQuickWrite(s.title)}
                        disabled={!canQuickWrite}
                        className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-40"
                      >
                        바로 쓰기
                      </button>
                    )}
                  </div>
                )}
                {selectable && onPickTopic && (
                  <button
                    type="button"
                    onClick={() => onPickTopic(s.title)}
                    className="mt-1.5 text-[11px] font-medium text-[#03A94D] hover:underline"
                  >
                    이걸 주제로
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className={`${embedded ? "mt-3" : "mt-4"} text-[11px] font-semibold text-[#4E5968]`}>
        {pack.scoped ? "주제에 맞는 장면" : "오늘 쓰기 좋은 장면"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pack.scenes.map((scene) => {
          const sceneKey = `scene-${scene}`;
          const isOn = selectable && selected?.has(sceneKey);
          if (selectable) {
            return (
              <button
                key={scene}
                type="button"
                onClick={() => onToggleStory?.(sceneKey)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
                  isOn
                    ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                    : "border-[#E8EBED] bg-[#F7F8FA] text-[#4E5968] hover:border-[#03C75A]"
                }`}
              >
                {scene}
              </button>
            );
          }
          return (
            <button
              key={scene}
              type="button"
              onClick={() => onPickScene?.(scene)}
              className="rounded-full border border-[#E8EBED] bg-[#F7F8FA] px-3 py-1.5 text-[12px] text-[#4E5968] transition hover:border-[#03C75A] hover:bg-[#E8F9EF] hover:text-[#03A94D]"
            >
              {scene}
            </button>
          );
        })}
      </div>

      {selectable && onQuickWrite && (
        <button
          type="button"
          onClick={() => onQuickWrite(pack.stories[0]?.title)}
          disabled={!canQuickWrite}
          className="mt-3 w-full rounded-lg bg-[#03C75A] py-2 text-[12px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-40"
        >
          선택한 주제로 바로 쓰기
        </button>
      )}

      {!compact && !embedded && (
        <p className="mt-3 text-[11px] text-[#B0B8C1]">
          감정: {pack.emotions.join(" · ")}
        </p>
      )}
    </div>
  );
}
