"use client";

import Icon from "./Icon";
import { blogSummaryOneLine } from "@/lib/contentPipeline";

/** 기준 콘텐츠 — 파생 채널이 어떤 블로그에서 나왔는지 표시 */
export default function BaseContentCard({
  blog,
  baseLabel,
  compact = false,
}) {
  if (!blog) return null;

  return (
    <div
      className={`rounded-xl border border-[#03C75A]/25 bg-[#F7FCF9] ${
        compact ? "px-4 py-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#03C75A] text-white">
          <Icon name="document" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#03A94D]">
            기준 콘텐츠
          </p>
          {baseLabel && (
            <p className="mt-0.5 text-[13px] font-semibold text-[#191F28]">
              {baseLabel}
            </p>
          )}
          <p className="mt-1 truncate text-[12px] text-[#4E5968]">
            {blogSummaryOneLine(blog)}
          </p>
        </div>
      </div>
    </div>
  );
}
