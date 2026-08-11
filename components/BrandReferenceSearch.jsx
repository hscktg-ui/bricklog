"use client";

import { useMemo, useState } from "react";
import { searchBrandContentReferences } from "@/lib/product/brandContentOsCenters";

/**
 * 자연어로 브랜드 과거 글·조사 레퍼런스 검색
 */
export default function BrandReferenceSearch({
  items = [],
  onSelect = null,
  className = "",
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchBrandContentReferences(items, query, { limit: 10 }).results,
    [items, query]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block">
        <span className="text-[11px] font-semibold text-[#8B95A1]">
          레퍼런스 검색 · 자연어
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 여름 메뉴 후기 · 주차 · 시술 상담"
          className="mt-1 w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[13px] text-[#191F28] outline-none focus:border-[#03C75A]"
        />
      </label>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
        {results.map((r) => (
          <li key={r.id || `${r.title}-${r.createdAt}`}>
            <button
              type="button"
              onClick={() => onSelect?.(r)}
              className="w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-left text-[12px] hover:border-[#03C75A]/50"
            >
              <span className="font-semibold text-[#191F28]">{r.title}</span>
              <p className="mt-0.5 text-[11px] text-[#8B95A1]">
                {r.channel}
                {query ? ` · 점수 ${r.score}` : ""}
              </p>
            </button>
          </li>
        ))}
        {query && results.length === 0 ? (
          <li className="text-[12px] text-[#8B95A1]">맞는 레퍼런스가 없습니다.</li>
        ) : null}
      </ul>
    </div>
  );
}
