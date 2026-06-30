"use client";

import { useMemo } from "react";
import {
  RESEARCH_QUERY_PLACEHOLDERS,
  RESEARCH_TYPE_OPTIONS,
  DEFAULT_RESEARCH_BUNDLE,
  RESEARCH_TYPE_CORE_IDS,
  RESEARCH_TYPE_EXTRA_IDS,
} from "@/lib/research/types";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

const CORE_LABEL = "기본 (최신·지역·키워드·트렌드)";

function normalizeTypes(types = []) {
  return [...new Set((types || []).filter(Boolean))];
}

function hasCoreBundle(types = []) {
  const set = new Set(types);
  return RESEARCH_TYPE_CORE_IDS.every((id) => set.has(id));
}

function applyCoreBundle(types = []) {
  const set = new Set(types);
  for (const id of DEFAULT_RESEARCH_BUNDLE) set.add(id);
  return [...set];
}

function removeCoreBundle(types = []) {
  const drop = new Set(DEFAULT_RESEARCH_BUNDLE);
  return types.filter((id) => !drop.has(id));
}

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

  const normalizedTypes = normalizeTypes(types);
  const coreOn = hasCoreBundle(normalizedTypes) || normalizedTypes.length === 0;
  const extraOptions = RESEARCH_TYPE_OPTIONS.filter((o) =>
    RESEARCH_TYPE_EXTRA_IDS.includes(o.id)
  );

  const handleEnabledChange = (next) => {
    onEnabledChange(next);
    if (next && normalizedTypes.length === 0) {
      onTypesChange([...DEFAULT_RESEARCH_BUNDLE]);
    }
  };

  const toggleCore = () => {
    if (coreOn && normalizedTypes.length === 0) {
      onTypesChange([...DEFAULT_RESEARCH_BUNDLE]);
      return;
    }
    if (coreOn) {
      onTypesChange(removeCoreBundle(normalizedTypes));
      return;
    }
    onTypesChange(applyCoreBundle(normalizedTypes));
  };

  const toggleExtra = (id) => {
    const set = new Set(normalizedTypes.length ? normalizedTypes : DEFAULT_RESEARCH_BUNDLE);
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
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
        />
        <span>
          <span className="text-[13px] font-semibold text-[#191F28]">
            자료조사 사용
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
            켜면 최신·지역 정보를 먼저 조사한 뒤 글을 씁니다
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-4 space-y-4 border-t border-[#E8EBED]/80 pt-4">
          <div>
            <p className="mb-2 text-[12px] font-medium text-[#4E5968]">조사 방식</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleCore}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  coreOn
                    ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                    : "border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#03C75A]/40"
                }`}
              >
                {CORE_LABEL}
              </button>
              {extraOptions.map((opt) => {
                const activeSet = new Set(
                  normalizedTypes.length ? normalizedTypes : DEFAULT_RESEARCH_BUNDLE
                );
                const on = activeSet.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleExtra(opt.id)}
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
            <p className="mt-2 text-[11px] text-[#8B95A1]">
              기본 조사는 켜 두는 것을 권장합니다. 지역·키워드·트렌드가 최신 정보에
              함께 반영됩니다.
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[#4E5968]">
              연구 주제 (선택)
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
              비우면 브랜드·지역·주제로 자동 조사합니다
            </p>
          </label>
        </div>
      ) : null}
    </div>
  );
}
