"use client";

import {
  VISION_CHIP_IDLE,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";

/** 브랜드·주제·업종 축 불일치 — 생성 전 Vision 2030 인라인 안내 */
export default function AxisAlignHint({
  hints,
  topicSuggestions,
  onPickTopic,
  className = "",
}) {
  if (!hints?.length) return null;
  return (
    <div
      className={`${VISION_STATUS_WARN} px-3 py-2.5 text-[12px] leading-relaxed text-[var(--vision-ink)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">입력 확인</p>
      {hints.map((line) => (
        <p key={line} className="mt-1 text-[var(--vision-muted)]">
          {line}
        </p>
      ))}
      {topicSuggestions?.length ? (
        <div className="mt-2">
          <p className="font-semibold text-[var(--vision-ink)]">이 브랜드에 맞는 주제 예시</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {topicSuggestions.map((topic) => (
              <li key={topic}>
                {onPickTopic ? (
                  <button
                    type="button"
                    className={`${VISION_CHIP_IDLE} px-2.5 py-1 text-[11px] font-medium`}
                    onClick={() => onPickTopic(topic)}
                  >
                    {topic}
                  </button>
                ) : (
                  <span className="text-[var(--vision-muted)]">{topic}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
