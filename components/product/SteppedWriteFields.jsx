"use client";

import { useMemo, useState } from "react";
import { WRITE_FLOW_STEPS } from "@/lib/product/craft";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

function firstOpenStep(filled) {
  const open = WRITE_FLOW_STEPS.find((s) => !filled[s.id]);
  return open?.id || WRITE_FLOW_STEPS[WRITE_FLOW_STEPS.length - 1].id;
}

/**
 * 브랜드 → 지역 → 주제 순서형 입력
 */
export default function SteppedWriteFields({
  values,
  errors = {},
  onPatch,
  onBlur,
  regionInputRef,
  topicRef,
  onRegionCompositionStart,
  onRegionCompositionEnd,
  compact = false,
}) {
  const filled = useMemo(
    () => ({
      brand: Boolean(values?.brandName?.trim()),
      region: Boolean(values?.region?.trim()),
      topic: Boolean(values?.topic?.trim()),
    }),
    [values?.brandName, values?.region, values?.topic]
  );

  const [manualStep, setManualStep] = useState(null);
  const activeId = manualStep || firstOpenStep(filled);
  const activeIndex = WRITE_FLOW_STEPS.findIndex((s) => s.id === activeId);
  const doneCount = WRITE_FLOW_STEPS.filter((s) => filled[s.id]).length;

  const goNext = () => {
    const next = WRITE_FLOW_STEPS[activeIndex + 1];
    if (next) setManualStep(next.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#8B95A1]">작성 시작</p>
        <p className="text-[11px] font-medium text-[#03A94D]">
          {doneCount === 3 ? "준비 완료" : `${doneCount}/3`}
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-1.5" aria-label="작성 단계">
        {WRITE_FLOW_STEPS.map((step, index) => {
          const isDone = filled[step.id];
          const isActive = step.id === activeId;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setManualStep(step.id)}
                className={`w-full rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition-colors ${
                  isActive
                    ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D] ring-2 ring-[#03C75A]/15"
                    : isDone
                      ? "border-[#03C75A]/40 bg-white text-[#03A94D]"
                      : "border-[#E8EBED] bg-white text-[#8B95A1]"
                }`}
              >
                <span className="block text-[10px] font-medium text-[#8B95A1]">
                  STEP {index + 1}
                </span>
                {isDone ? "✓ " : ""}
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>

      {activeId === "brand" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#4E5968]">
            STEP 1 · 브랜드명 <span className="text-[#03C75A]">*</span>
          </span>
          <input
            className={fieldClass}
            value={values.brandName || ""}
            onChange={(e) => onPatch({ brandName: e.target.value })}
            onBlur={onBlur}
            placeholder="매장·브랜드·팀 이름"
            autoFocus
          />
          {errors.brandName ? (
            <p className="mt-1 text-[12px] text-[#E67700]">{errors.brandName}</p>
          ) : (
            <p className="mt-1 text-[11px] text-[#8B95A1]">
              독자가 알아볼 브랜드 이름만 적어 주세요.
            </p>
          )}
        </label>
      ) : null}

      {activeId === "region" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#4E5968]">
            STEP 2 · 지역 <span className="text-[#03C75A]">*</span>
          </span>
          <input
            ref={regionInputRef}
            className={fieldClass}
            value={values.region || ""}
            onChange={(e) => onPatch({ region: e.target.value })}
            onCompositionStart={onRegionCompositionStart}
            onCompositionEnd={onRegionCompositionEnd}
            onBlur={onBlur}
            placeholder="예: 서울 마포, 경기 용인"
            autoFocus
          />
          {errors.region ? (
            <p className="mt-1 text-[12px] text-[#E67700]">{errors.region}</p>
          ) : (
            <p className="mt-1 text-[11px] text-[#8B95A1]">
              매장·쇼룸·서비스 지역을 알려 주세요.
            </p>
          )}
        </label>
      ) : null}

      {activeId === "topic" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#4E5968]">
            STEP 3 · 오늘의 주제 <span className="text-[#03C75A]">*</span>
          </span>
          <textarea
            ref={topicRef}
            className={`${fieldClass} ${compact ? "min-h-[56px]" : "min-h-[80px]"} resize-y`}
            value={values.topic || ""}
            onChange={(e) => {
              const topic = e.target.value;
              onPatch({
                topic,
                mainKeyword:
                  values.mainKeyword || topic.split(/[,，]/)[0]?.trim(),
              });
            }}
            onBlur={onBlur}
            placeholder="오늘 전하고 싶은 이야기, 장면, 상황"
            autoFocus
          />
          {errors.topic ? (
            <p className="mt-1 text-[12px] text-[#E67700]">{errors.topic}</p>
          ) : (
            <p className="mt-1 text-[11px] text-[#8B95A1]">
              검색어가 아니라, 오늘 쓸 이야기를 한 줄로 적어도 됩니다.
            </p>
          )}
        </label>
      ) : null}

      {activeIndex < WRITE_FLOW_STEPS.length - 1 && filled[activeId] ? (
        <button
          type="button"
          onClick={goNext}
          className="w-full rounded-lg border border-[#03C75A]/30 bg-[#F6FDF9] py-2.5 text-[13px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF]"
        >
          다음: {WRITE_FLOW_STEPS[activeIndex + 1]?.label}
        </button>
      ) : null}
    </div>
  );
}
