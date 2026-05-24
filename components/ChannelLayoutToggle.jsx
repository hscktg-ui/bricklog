"use client";

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
      className={`inline-flex rounded-lg border border-[#E8EBED] bg-[#F7F8FA] p-0.5 ${className}`}
      role="group"
      aria-label="화면 보기 모드"
    >
      <button
        type="button"
        onClick={() => onChange?.("concise")}
        className={`min-h-[40px] rounded-md px-3 py-2 text-[12px] font-semibold transition ${
          layoutMode === "concise"
            ? "bg-white text-[#03A94D] shadow-sm"
            : "text-[#8B95A1] hover:text-[#4E5968]"
        }`}
        aria-pressed={layoutMode === "concise"}
      >
        간결 보기
      </button>
      <button
        type="button"
        onClick={() => onChange?.("full")}
        className={`min-h-[40px] rounded-md px-3 py-2 text-[12px] font-semibold transition ${
          layoutMode === "full"
            ? "bg-white text-[#03A94D] shadow-sm"
            : "text-[#8B95A1] hover:text-[#4E5968]"
        }`}
        aria-pressed={layoutMode === "full"}
      >
        전체 보기
      </button>
    </div>
  );
}
