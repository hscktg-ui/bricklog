"use client";

import { useState } from "react";

export default function VerificationStatus({ verification, factCheck }) {
  const [open, setOpen] = useState(false);
  const v = verification || {};
  const risky = factCheck?.riskyClaims?.length ?? 0;
  const needsAttention =
    v.needsSearchVerification || risky > 0 || v.noForbidden === false;

  const items = [
    {
      label: v.sourceLabel || "브랜드 입력 반영",
      ok: v.sourceLabel !== "사용자 입력 기반",
    },
    {
      label: v.needsSearchVerification ? "직접 확인 권장" : "입력 기반",
      ok: !v.needsSearchVerification,
      warn: v.needsSearchVerification,
    },
    { label: "금지어 없음", ok: v.noForbidden !== false },
    { label: "글자수", ok: v.charCountOk !== false },
    {
      label: risky ? `표현 확인 ${risky}건` : "표현 검토 통과",
      ok: factCheck?.pass !== false,
      warn: risky > 0,
    },
  ];

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-[11px] font-medium text-[#4E5968]">
          {needsAttention ? "작성 전에 한번 더 볼 부분" : "작성 체크 (선택)"}
        </span>
        <span className="text-[10px] text-[#8B95A1]">{open ? "닫기" : "열기"}</span>
      </button>
      {open && (
        <div className="border-t border-[#E8EBED] px-3 pb-2.5 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.label}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  item.warn
                    ? "bg-[#FFF8E6] text-[#E67700]"
                    : item.ok
                      ? "bg-[#E8F9EF] text-[#03A94D]"
                      : "bg-[#FFF0F0] text-[#D32F2F]"
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
