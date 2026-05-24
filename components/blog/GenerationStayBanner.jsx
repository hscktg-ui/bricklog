"use client";

/** 생성·결과 표시 중 이탈 방지 안내 */
export default function GenerationStayBanner({ variant = "form" }) {
  const isResult = variant === "result";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed ${
        isResult
          ? "border-[#03C75A]/30 bg-[#F0FFF5] text-[#03A94D]"
          : "border-[#FFE0B2] bg-[#FFF8E6] text-[#8A6D00]"
      }`}
      role="status"
    >
      <p className="font-semibold text-[#191F28]">
        {isResult ? "완성본을 불러오는 중" : "잠시만 기다려 주세요"}
      </p>
      <p className="mt-0.5">
        새로고침·뒤로가기·탭 닫기를 하지 마세요. 곧 이 화면에 글이
        표시됩니다.
      </p>
    </div>
  );
}
