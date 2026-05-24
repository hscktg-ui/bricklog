"use client";

import { useMemo } from "react";
import {
  RESEARCH_QUERY_PLACEHOLDERS,
  RESEARCH_TYPE_OPTIONS,
} from "@/lib/research/types";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

/**
 * @param {{
 *   enabled: boolean;
 *   types: string[];
 *   query: string;
 *   onEnabledChange: (v: boolean) => void;
 *   onTypesChange: (ids: string[]) => void;
 *   onQueryChange: (q: string) => void;
 *   compact?: boolean;
 * }} props
 */
export default function ResearchModePanel({
  enabled,
  types = [],
  query = "",
  onEnabledChange,
  onTypesChange,
  onQueryChange,
  compact = false,
}) {
  const placeholder = useMemo(() => {
    const i = Math.floor(Date.now() / 86_400_000) % RESEARCH_QUERY_PLACEHOLDERS.length;
    return RESEARCH_QUERY_PLACEHOLDERS[i];
  }, []);

  const toggleType = (id) => {
    const set = new Set(types);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onTypesChange([...set]);
  };

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
        />
        <span>
          <span className="text-[13px] font-semibold text-[#191F28]">
            자료조사 사용
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
            켜면 조사 → 요약 → 브랜드 메모리 반영 후 글을 씁니다
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-4 space-y-4 border-t border-[#E8EBED]/80 pt-4">
          <div>
            <p className="mb-2 text-[12px] font-medium text-[#4E5968]">조사 유형</p>
            <div className="flex flex-wrap gap-2">
              {RESEARCH_TYPE_OPTIONS.map((opt) => {
                const on = types.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleType(opt.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      on
                        ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                        : "border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#03C75A]/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[#4E5968]">
              연구 주제
            </span>
            <input
              type="text"
              className={fieldClass}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              maxLength={200}
            />
            <p className="mt-1 text-[11px] text-[#8B95A1]">
              예: {RESEARCH_QUERY_PLACEHOLDERS.join(" · ")}
            </p>
          </label>
        </div>
      ) : null}
    </div>
  );
}
