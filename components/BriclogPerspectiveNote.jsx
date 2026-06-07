"use client";

import {
  BRICLOG_DIRECTOR_LINE,
  BRICLOG_PERSPECTIVE_LINE,
} from "@/lib/product/briclogPerspectiveCopy";

export default function BriclogPerspectiveNote({ compact = false }) {
  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      role="note"
    >
      <p className="text-[11px] font-semibold text-[#03A94D]">브릭로그 방식</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
        {BRICLOG_PERSPECTIVE_LINE}
      </p>
      {!compact && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#8B95A1]">
          {BRICLOG_DIRECTOR_LINE}
        </p>
      )}
    </div>
  );
}
