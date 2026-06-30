/**
 * 심플 작업실(3칸) — 브랜드 마케팅 기본값 SSOT
 */
import { DEFAULT_RESEARCH_BUNDLE } from "@/lib/research/types";
import { applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";

/** 구매자 후기형 오인 방지 — 브랜드 소개·정보형 우선 */
export function applySimpleWorkspaceDefaults(input = {}) {
  const next = { ...input };
  if (!next.v4Speaker || next.v4Speaker === "auto") {
    next.v4Speaker = "brand_intro";
  }
  if (next.researchEnabled !== false && !(next.researchTypes || []).length) {
    next.researchTypes = [...DEFAULT_RESEARCH_BUNDLE];
  }
  return applyV4SpeakerToInput(next);
}
