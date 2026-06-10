"use client";

import { BRICLOG_METHOD_STEPS } from "@/lib/product/craft";

export default function BriclogPerspectiveNote({ compact = false }) {
  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] ${
        compact ? "px-3 py-2.5" : "px-4 py-3"
      }`}
      role="note"
      aria-label="브릭로그 방식"
    >
      <p className="text-[11px] font-semibold text-[#03A94D]">브릭로그 방식</p>
      <ol className="mt-2 flex items-center justify-between gap-1">
        {BRICLOG_METHOD_STEPS.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span
                className={`flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E8EBED] ${
                  compact ? "h-8 w-8 text-[14px]" : "h-9 w-9 text-[16px]"
                }`}
                aria-hidden
              >
                {step.icon}
              </span>
              <span
                className={`mt-1 font-semibold text-[#191F28] ${
                  compact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < BRICLOG_METHOD_STEPS.length - 1 ? (
              <span
                className="mx-0.5 shrink-0 text-[#B0B8C1]"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
