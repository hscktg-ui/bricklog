"use client";

import { useState } from "react";
import { USER_QUALITY_GOAL } from "@/lib/quality/qualityTargets";
import {
  CUSTOMER_DRAFT_READY,
  CUSTOMER_DRAFT_REVIEW,
} from "@/lib/copy/customerFacing";

const BREAKDOWN_LABELS = {
  topicFit: "주제 적합",
  inputAlignment: "입력 일치",
  searchIntent: "검색 의도",
  brandPresence: "브랜드 반영",
  personaConsistency: "화자 일관",
  toneConsistency: "말투 일관",
  emotionTone: "감정 온도",
  repetition: "반복 억제",
  aiCliche: "관용구 억제",
  placeholder: "완성도",
  length: "분량",
};

const FAIL_LABELS = {
  placeholder_detected: "미완성 표현",
  ai_cliche_detected: "AI 관용구",
  repetition_detected: "문장 반복",
  topic_drift: "주제 이탈",
  input_mismatch: "입력 불일치",
  search_intent_missing: "검색 의도 부족",
  brand_presence_missing: "브랜드 미반영",
  persona_inconsistency: "화자 불일치",
  tone_inconsistency: "말투 혼용",
  fake_location_inserted: "임의 지역명",
  length_too_short: "분량 부족",
};

export default function CoreQualityMetaPanel({ meta = {} }) {
  const [open, setOpen] = useState(false);
  const score =
    meta?.qualityScore?.total ?? meta?.coreQuality?.total ?? meta?.qualityScore;
  if (typeof score !== "number" && !meta?.personaLabel) return null;

  const breakdown =
    meta?.qualityScore?.breakdown || meta?.coreQuality?.breakdown || {};
  const failReasons = meta?.failReasons || meta?.coreQuality?.failReasons || [];
  const suggestions = meta?.improvementSuggestions || [];
  const passed =
    typeof score === "number" && score >= USER_QUALITY_GOAL;

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#4E5968] hover:bg-white/80"
      >
        <span>작성 검수 상세</span>
        <span className="text-[#8B95A1]">{open ? "접기" : "펼치기"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-[#E8EBED] px-4 py-3 text-[12px] text-[#4E5968]">
          {typeof score === "number" && (
            <p className="font-semibold text-[#03A94D]">
              {passed ? CUSTOMER_DRAFT_READY : CUSTOMER_DRAFT_REVIEW}
              {meta?.rewriteCount != null && meta.rewriteCount > 0 && (
                <span className="font-normal text-[#8B95A1]">
                  {" "}
                  · 다듬기 {meta.rewriteCount}회 반영
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {meta.personaLabel && (
              <span className="rounded-lg border border-[#E8EBED] bg-white px-2 py-1">
                화자 · {meta.personaLabel}
              </span>
            )}
            {meta.emotionToneLabel && (
              <span className="rounded-lg border border-[#E8EBED] bg-white px-2 py-1">
                감정 · {meta.emotionToneLabel}
              </span>
            )}
            {meta.writingToneLabel && (
              <span className="rounded-lg border border-[#E8EBED] bg-white px-2 py-1">
                말투 · {meta.writingToneLabel}
              </span>
            )}
            {meta.skillLevelLabel && (
              <span className="rounded-lg border border-[#E8EBED] bg-white px-2 py-1">
                숙련도 · {meta.skillLevelLabel}
              </span>
            )}
          </div>
          {Object.keys(breakdown).length > 0 && (
            <ul className="grid grid-cols-2 gap-1 text-[11px] text-[#8B95A1]">
              {Object.entries(breakdown)
                .filter(([, v]) =>
                  typeof v === "number" ? v >= 70 : v === "ok" || v === true
                )
                .map(([k]) => (
                  <li key={k}>✓ {BREAKDOWN_LABELS[k] || k}</li>
                ))}
            </ul>
          )}
          {failReasons.length > 0 && (
            <p className={`text-[11px] ${passed ? "text-[#8B95A1]" : "text-[#E67700]"}`}>
              {!passed && "보완 권장 · "}
              {failReasons
                .map((r) => FAIL_LABELS[r] || r)
                .slice(0, 4)
                .join(" · ")}
            </p>
          )}
          {suggestions.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[#8B95A1]">
              {suggestions.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
