import { BRAND_TAGLINE } from "@/lib/constants";

export default function MatrixBanner({ meta }) {
  if (!meta) return null;

  return (
    <div className="mb-3 rounded-xl border border-[#03C75A]/15 bg-gradient-to-r from-[#E8F9EF]/80 to-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#03A94D]">
        Prompt Engine v4 · {BRAND_TAGLINE}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
        {meta.matrixSummary || meta.engine}
      </p>
      {meta.blogCharCount != null && (
        <p className="mt-1.5 text-[11px] text-[#8B95A1]">
          블로그 {meta.blogCharCount.toLocaleString()}자 (공백 제외)
          {meta.mainKeywordUses != null &&
            ` · 메인키워드 ${meta.mainKeywordUses}회`}
          {meta.placeDetailChars != null &&
            ` · 플레이스 상세 ${meta.placeDetailChars}자`}
        </p>
      )}
    </div>
  );
}
