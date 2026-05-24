"use client";

import { useState } from "react";
import ImprovementButtons from "./ImprovementButtons";
import VersionCompare from "./VersionCompare";

export default function EditorAIReport({
  report,
  channel = "blog",
  onImprove,
  compare = null,
  improving = false,
}) {
  const [open, setOpen] = useState(false);
  if (!report?.suggestions?.length && !onImprove) return null;

  const needsAttention = !report.pass;

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-[12px] font-medium text-[#4E5968]">
          {needsAttention ? "✎ 검수 메모가 있습니다" : "✎ 개선 제안 보기"}
        </span>
        <span className="text-[11px] text-[#8B95A1]">{open ? "닫기" : "열기"}</span>
      </button>

      {open && (
        <div className="border-t border-[#E8EBED] px-3 pb-3 pt-2">
          {compare?.after != null && compare.before != null && (
            <div className="mb-2">
              <VersionCompare compare={compare} />
            </div>
          )}

          {report.suggestions?.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-[12px] leading-relaxed text-[#4E5968]">
              {report.suggestions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}

          {report.issues?.some((i) => i.severity === "fail") && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-[#E67700]">
              {report.issues
                .filter((i) => i.severity === "fail")
                .slice(0, 2)
                .map((i) => (
                  <li key={i.id}>· {i.message}</li>
                ))}
            </ul>
          )}

          {onImprove && (
            <div className="mt-3">
              <ImprovementButtons onImprove={onImprove} loading={improving} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
