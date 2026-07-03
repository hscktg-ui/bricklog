"use client";

import {
  VISION_CHIP_IDLE,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";
import {
  needsGenerationContextBeat,
  resolveGenerationContextBeat,
  toggleContextBeatChip,
} from "@/lib/product/generationContextBeat";
import { evaluateEditorGradeResearchGate } from "@/lib/product/editorGradeResearchGate";

/** 조사 팩트 부족 — 생성 전 인라인 가이드 (422 research_density_gate 예방) */
export default function ResearchDensityHint({
  input = {},
  storeFeatures = "",
  onStoreFeaturesChange,
  className = "",
}) {
  if (!needsGenerationContextBeat(input)) return null;

  const gate = evaluateEditorGradeResearchGate(input);
  const beat = resolveGenerationContextBeat(input);
  const value = storeFeatures || input.storeFeatures || "";

  return (
    <div
      className={`${VISION_STATUS_WARN} px-3 py-2.5 text-[12px] leading-relaxed text-[var(--vision-ink)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">{beat.headline}</p>
      <p className="mt-1 text-[var(--vision-muted)]">
        {gate.userMessage || beat.hint}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {beat.chips.slice(0, 5).map((chip) => (
          <button
            key={chip}
            type="button"
            className={`${VISION_CHIP_IDLE} px-2.5 py-1 text-[11px] font-medium`}
            onClick={() => onStoreFeaturesChange?.(toggleContextBeatChip(value, chip))}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
