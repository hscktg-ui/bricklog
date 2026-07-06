"use client";

import { useMemo } from "react";
import { resolveWritingContract } from "@/lib/content/writingContract";
import { VISION_STATUS_NEUTRAL } from "@/lib/landing/vision2030Styles";

/** 생성 전 — 이번 글 유형·독자가 얻는 것 미리보기 */
export default function WritingContractPreview({ input = {}, compact = false }) {
  const contract = useMemo(() => resolveWritingContract(input), [
    input.brandName,
    input.topic,
    input.mainKeyword,
    input.includePhrases,
    input.storeFeatures,
    input.industry,
    input.purpose,
    input.purposeType,
    input.contentObjective,
    input.contentPersona,
    input.contentPersonaSubtype,
  ]);

  if (!input.topic?.trim()) return null;

  return (
    <div
      className={`${VISION_STATUS_NEUTRAL} px-3 py-2.5`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`font-semibold text-[var(--vision-ink)] ${
          compact ? "text-[11px]" : "text-[12px]"
        }`}
      >
        이번 글 유형: {contract.label}
        {contract.density === "segmented" ? (
          <span className="ml-1.5 font-medium text-[var(--vision-accent-deep,#03a94d)]">
            · 항목별 설명
          </span>
        ) : null}
      </p>
      <p
        className={`mt-1 leading-relaxed text-[var(--vision-muted)] ${
          compact ? "text-[11px]" : "text-[12px]"
        }`}
      >
        독자는 {contract.readerGain}
        {contract.visitToneAllowed ? null : " (방문 후기 톤은 쓰지 않습니다)"}
      </p>
    </div>
  );
}
