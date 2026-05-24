"use client";

export default function HumanEditBar({ onSave, saved, similarity }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5">
      <div>
        <p className="text-[12px] font-semibold text-[#191F28]">AI 초안 · 사람 검수</p>
        <p className="text-[11px] text-[#8B95A1]">
          수정 후 저장하면 브랜드에 검수본이 기록됩니다
        </p>
        {similarity?.warning && (
          <p className="mt-1 text-[11px] font-medium text-[#E67700]">
            {similarity.warning}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${
          saved
            ? "bg-[#E8F9EF] text-[#03A94D]"
            : "bg-[#03C75A] text-white hover:bg-[#02B350]"
        }`}
      >
        {saved ? "저장됨 ✓" : "검수본 저장"}
      </button>
    </div>
  );
}
