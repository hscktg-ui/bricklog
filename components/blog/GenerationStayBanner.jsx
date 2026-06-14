"use client";

import {
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";

/** 생성·결과 표시 중 이탈 방지 안내 */
export default function GenerationStayBanner({ variant = "form" }) {
  const isResult = variant === "result";
  return (
    <div
      className={`px-3 py-2.5 text-[12px] leading-relaxed ${
        isResult ? VISION_STATUS_OK : VISION_STATUS_WARN
      } ${isResult ? "text-[var(--vision-accent)]" : "text-[#8A6D00]"}`}
      role="status"
    >
      <p className="font-semibold text-[var(--vision-ink)]">
        {isResult ? "완성본을 불러오는 중" : "잠시만 기다려 주세요"}
      </p>
      <p className="mt-0.5 text-[var(--vision-muted)]">
        새로고침·뒤로가기·탭 닫기를 하지 마세요. 곧 이 화면에 글이
        표시됩니다.
      </p>
    </div>
  );
}
