"use client";

import {
  VISION_TAB_ACTIVE,
  VISION_TAB_IDLE,
} from "@/lib/landing/vision2030Styles";

/**
 * Per-channel screen mode: concise body-first vs full workspace panels.
 */
export default function ChannelLayoutToggle({
  layoutMode = "full",
  onChange,
  className = "",
}) {
  return (
    <div
      className={`inline-flex rounded-full border border-[var(--vision-line)] bg-[var(--vision-paper)] p-0.5 ${className}`}
      role="group"
      aria-label="화면 보기 모드"
    >
      <button
        type="button"
        onClick={() => onChange?.("concise")}
        className={`min-h-[40px] rounded-full px-3 py-2 text-[12px] font-semibold transition ${
          layoutMode === "concise" ? VISION_TAB_ACTIVE : VISION_TAB_IDLE
        }`}
        aria-pressed={layoutMode === "concise"}
      >
        간결 보기
      </button>
      <button
        type="button"
        onClick={() => onChange?.("full")}
        className={`min-h-[40px] rounded-full px-3 py-2 text-[12px] font-semibold transition ${
          layoutMode === "full" ? VISION_TAB_ACTIVE : VISION_TAB_IDLE
        }`}
        aria-pressed={layoutMode === "full"}
      >
        전체 보기
      </button>
    </div>
  );
}
