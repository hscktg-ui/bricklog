"use client";

import { useEffect, useState } from "react";
import {
  PUBLIC_TEST_LOADING_STEP_MS,
  PUBLIC_TEST_LOADING_STEPS,
} from "@/lib/publicTest/publicTestLoadingSteps";

export default function PublicTestLoadingProgress({ active, message }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % PUBLIC_TEST_LOADING_STEPS.length);
    }, PUBLIC_TEST_LOADING_STEP_MS);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-[#E8EBED] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#191F28]">{message}</p>
        <span className="text-[11px] tabular-nums text-[#8B95A1]">
          {stepIndex + 1}/{PUBLIC_TEST_LOADING_STEPS.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EBED]">
        <div
          className="h-full rounded-full bg-[#03C75A] transition-all duration-500 ease-out"
          style={{
            width: `${((stepIndex + 1) / PUBLIC_TEST_LOADING_STEPS.length) * 100}%`,
          }}
        />
      </div>
      <ul className="space-y-1.5">
        {PUBLIC_TEST_LOADING_STEPS.map((step, i) => (
          <li
            key={step.id}
            className={`flex items-center gap-2 text-[12px] ${
              i === stepIndex
                ? "font-semibold text-[#03A94D]"
                : i < stepIndex
                  ? "text-[#4E5968]"
                  : "text-[#B0B8C1]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                i <= stepIndex ? "bg-[#03C75A]" : "bg-[#E8EBED]"
              }`}
              aria-hidden
            />
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
