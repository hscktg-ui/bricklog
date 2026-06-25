"use client";

import { VISION_STATUS_WARN } from "@/lib/landing/vision2030Styles";

/** 브랜드·주제·업종 축 불일치 — 생성 전 Vision 2030 인라인 안내 */
export default function AxisAlignHint({ hints, className = "" }) {
  if (!hints?.length) return null;
  return (
    <div
      className={`${VISION_STATUS_WARN} px-3 py-2.5 text-[12px] leading-relaxed text-[var(--vision-ink)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">입력 확인</p>
      {hints.map((line) => (
        <p key={line} className="mt-1 text-[var(--vision-muted)]">
          {line}
        </p>
      ))}
    </div>
  );
}
