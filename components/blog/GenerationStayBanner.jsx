"use client";

import {
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";
import { getGenerationSteps } from "@/lib/loading/generationSteps";

/** 생성·결과 표시 중 이탈 방지 안내 + 진행 단계 */
export default function GenerationStayBanner({
  variant = "form",
  channel = "blog",
  sensitiveIndustry = false,
  stepLabel = null,
}) {
  const isResult = variant === "result";
  const steps = getGenerationSteps(channel, { sensitiveIndustry });
  const activeStep =
    stepLabel ||
    steps.find((s) => s.text)?.text ||
    steps[0]?.text ||
    null;

  return (
    <div
      className={`px-3 py-2.5 text-[12px] leading-relaxed ${
        isResult ? VISION_STATUS_OK : VISION_STATUS_WARN
      } ${isResult ? "text-[var(--vision-accent)]" : "text-[#8A6D00]"}`}
      role="status"
    >
      <p className="font-semibold text-[var(--vision-ink)]">
        {isResult ? "완성본을 불러오는 중" : "잠시만 기다려 주세요"}
      </p>
      {activeStep && !isResult ? (
        <p className="mt-0.5 font-medium text-[var(--vision-ink)]">{activeStep}</p>
      ) : null}
      <p className="mt-0.5 text-[var(--vision-muted)]">
        {isResult
          ? "곧 이 화면에 글이 표시됩니다."
          : "새로고침·뒤로가기·탭 닫기를 하지 마세요. 보통 2~4분 안에 완료됩니다."}
      </p>
      {!isResult && steps.length > 1 ? (
        <ol className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-[var(--vision-muted)]">
          {steps.map((step, idx) => (
            <li key={step.text || idx}>
              {idx + 1}. {step.text?.replace(/…$/, "") || step.text}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
