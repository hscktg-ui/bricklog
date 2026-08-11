"use client";

import { BRAND_CONTENT_OS_CENTERS } from "@/lib/product/brandContentOsCenters";
import { WRITE_FLOW_STEPS } from "@/lib/product/craft";

/** 입력 3단계 + Brand Content OS 5센터 */
export default function WriteFlowSteps({ values }) {
  const filled = {
    brand: Boolean(values?.brandName?.trim()),
    region: Boolean(values?.region?.trim()),
    topic: Boolean(values?.topic?.trim()),
  };
  const done = WRITE_FLOW_STEPS.filter((s) => filled[s.id]).length;
  const centersReady = done === 3;

  return (
    <div className="space-y-2.5" aria-label="작성 단계">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#8B95A1]">입력 3단계</p>
        <p className="text-[11px] font-medium text-[#03A94D]">
          {done === 3 ? "준비 완료" : `${done}/3`}
        </p>
      </div>
      <ol className="grid grid-cols-3 gap-1.5">
        {WRITE_FLOW_STEPS.map((step, index) => {
          const isDone = filled[step.id];
          return (
            <li
              key={step.id}
              className={`rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition-colors ${
                isDone
                  ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                  : "border-[#E8EBED] bg-white text-[#8B95A1]"
              }`}
            >
              <span className="sr-only">{index + 1}단계 </span>
              {isDone ? "✓ " : `${index + 1}. `}
              {step.label}
            </li>
          );
        })}
      </ol>

      <div>
        <p className="text-[11px] font-semibold text-[#8B95A1]">
          Brand Content OS · 5센터
        </p>
        <ul className="mt-1.5 grid grid-cols-5 gap-1">
          {BRAND_CONTENT_OS_CENTERS.map((c) => (
            <li
              key={c.id}
              title={c.role}
              className={`rounded-md border px-0.5 py-1.5 text-center text-[9px] font-semibold leading-tight ${
                centersReady
                  ? "border-[#03C75A]/50 bg-[#F0FFF5] text-[#03A94D]"
                  : "border-[#E8EBED] bg-white text-[#8B95A1]"
              }`}
            >
              {c.short}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
