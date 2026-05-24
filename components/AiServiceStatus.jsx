"use client";

import { LLM_USER_MESSAGES } from "@/lib/llm/messages";
import { SERVICE_STATUS } from "@/lib/product/craft";

/**
 * 일반 사용자용 — API Key 입력 요청 없음
 */
export default function AiServiceStatus({
  llmAvailable,
  mode,
  operatorHint,
  compact = false,
}) {
  if (llmAvailable === true) return null;
  if (llmAvailable === null) {
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-[#F9FAFB] p-3 text-[12px] text-[#8B95A1]">
        {SERVICE_STATUS.checking}
      </div>
    );
  }

  const isBrief = mode === "brief_only" || !llmAvailable;

  return (
    <div
      className={`rounded-xl border ${
        isBrief
          ? "border-[#FFE0B2] bg-[#FFF8E6]"
          : "border-[#E8EBED] bg-[#F9FAFB]"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <p className="text-[13px] font-semibold text-[#191F28]">
        {SERVICE_STATUS.briefTitle}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[#4E5968]">
        {SERVICE_STATUS.briefBody}
      </p>
      {!compact && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">
          {LLM_USER_MESSAGES.briefOnlyBody}
        </p>
      )}
      {operatorHint && process.env.NODE_ENV === "development" && (
        <details className="mt-3 text-[10px] text-[#8B95A1]">
          <summary className="cursor-pointer font-medium text-[#4E5968]">
            개발자: 글 생성 연결
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2">
            {operatorHint.envFile}에{"\n"}
            {operatorHint.variable}
            {"\n"}저장 후 {operatorHint.restart}
            {"\n\n"}
            {operatorHint.note}
          </pre>
        </details>
      )}
    </div>
  );
}
