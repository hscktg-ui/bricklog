"use client";

import { useEffect, useState } from "react";
import {
  PUBLIC_TEST_LOADING_STEP_MS,
  PUBLIC_TEST_LOADING_STEPS,
} from "@/lib/publicTest/publicTestLoadingSteps";
import {
  VISION_PROGRESS_FILL,
  VISION_PROGRESS_TRACK,
  VISION_WORKSPACE_PANEL,
} from "@/lib/landing/vision2030Styles";

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
    <div className={`${VISION_WORKSPACE_PANEL} mt-4 space-y-3 px-4 py-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--vision-ink)]">{message}</p>
        <span className="text-[11px] tabular-nums text-[var(--vision-muted)]">
          {stepIndex + 1}/{PUBLIC_TEST_LOADING_STEPS.length}
        </span>
      </div>
      <div className={VISION_PROGRESS_TRACK}>
        <div
          className={VISION_PROGRESS_FILL}
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
                ? "font-semibold text-[var(--vision-accent)]"
                : i < stepIndex
                  ? "text-[var(--vision-muted)]"
                  : "text-[var(--vision-line-strong)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                i <= stepIndex
                  ? "bg-[var(--vision-accent)]"
                  : "bg-[var(--vision-line-strong)]"
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
