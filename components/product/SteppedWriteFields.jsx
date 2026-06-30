"use client";

import { useMemo, useState } from "react";
import { WRITE_FLOW_STEPS } from "@/lib/product/craft";
import {
  VISION_CHIP_ACTIVE,
  VISION_CHIP_IDLE,
  VISION_EYEBROW,
  VISION_GHOST_BTN,
  VISION_INPUT,
  VISION_PROGRESS_FILL,
  VISION_PROGRESS_TRACK,
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
  VISION_WORKSPACE_PANEL,
} from "@/lib/landing/vision2030Styles";

const fieldClass = `${VISION_INPUT} !mt-0 text-[14px]`;

const REQUIRED_STEPS = ["brand", "region", "topic"];

function firstOpenStep(filled) {
  const open = WRITE_FLOW_STEPS.find((s) => !filled[s.id]);
  return open?.id || WRITE_FLOW_STEPS[WRITE_FLOW_STEPS.length - 1].id;
}

/**
 * 브랜드 → 지역 → 주제 → 현장 한 줄 순서형 입력 (Vision 2030)
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
      scene: Boolean(values?.storeFeatures?.trim()),
    }),
    [values?.brandName, values?.region, values?.topic, values?.storeFeatures]
  );

  const [manualStep, setManualStep] = useState(null);
  const activeId = manualStep || firstOpenStep(filled);
  const activeIndex = WRITE_FLOW_STEPS.findIndex((s) => s.id === activeId);
  const requiredDone = REQUIRED_STEPS.filter((id) => filled[id]).length;
  const progressPct = Math.round((requiredDone / 3) * 100);

  const goNext = () => {
    const next = WRITE_FLOW_STEPS[activeIndex + 1];
    if (next) setManualStep(next.id);
  };

  const statusLabel =
    requiredDone === 3
      ? filled.scene
        ? "준비 완료"
        : "현장 한 줄 권장"
      : `${requiredDone}/3`;

  return (
    <div className={`${VISION_WORKSPACE_PANEL} space-y-3 p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className={VISION_EYEBROW}>작성 시작</p>
        <p
          className={`text-[11px] font-semibold ${
            requiredDone === 3 && filled.scene
              ? "text-[var(--vision-accent-deep,#03a94d)]"
              : "text-[var(--vision-muted)]"
          }`}
        >
          {statusLabel}
        </p>
      </div>

      <div className={VISION_PROGRESS_TRACK} aria-hidden>
        <div
          className={VISION_PROGRESS_FILL}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ol className="grid grid-cols-4 gap-1" aria-label="작성 단계">
        {WRITE_FLOW_STEPS.map((step, index) => {
          const isDone = filled[step.id];
          const isActive = step.id === activeId;
          const optional = step.id === "scene";
          const chipClass = isActive
            ? `${VISION_CHIP_ACTIVE} ring-2 ring-[var(--vision-accent-ring,rgba(3,199,90,0.15))]`
            : isDone
              ? VISION_CHIP_ACTIVE
              : VISION_CHIP_IDLE;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setManualStep(step.id)}
                aria-label={`${step.label} 입력 단계로 이동`}
                aria-current={isActive ? "step" : undefined}
                title="단계 이동만 합니다. 생성은 아래 「조사 후 글 받기」를 눌러 주세요."
                className={`briclog-pressable w-full rounded-full border px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-colors ${chipClass}`}
              >
                <span className="block text-[9px] font-medium text-[var(--vision-muted)]">
                  {index + 1}
                  {optional ? "·선택" : ""}
                </span>
                {isDone ? "✓ " : ""}
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>

      {filled.brand && activeId !== "brand" ? (
        <p className="text-[12px] text-[var(--vision-muted)]">
          <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
            브랜드
          </span>{" "}
          {values.brandName?.trim()}
        </p>
      ) : null}
      {filled.region && activeId !== "brand" && activeId !== "region" ? (
        <p className="text-[12px] text-[var(--vision-muted)]">
          <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
            지역
          </span>{" "}
          {values.region?.trim()}
        </p>
      ) : null}
      {filled.topic && activeId === "scene" ? (
        <p className="text-[12px] text-[var(--vision-muted)]">
          <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
            주제
          </span>{" "}
          {values.topic?.trim().slice(0, 48)}
          {(values.topic?.trim().length || 0) > 48 ? "…" : ""}
        </p>
      ) : null}

      {activeId === "brand" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--vision-ink)]">
            STEP 1 · 브랜드명{" "}
            <span className="text-[var(--vision-accent)]">*</span>
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
            <p className={`mt-1 text-[12px] ${VISION_STATUS_WARN} px-2 py-1`}>
              {errors.brandName}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
              독자가 알아볼 브랜드 이름만 적어 주세요.
            </p>
          )}
        </label>
      ) : null}

      {activeId === "region" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--vision-ink)]">
            STEP 2 · 지역 <span className="text-[var(--vision-accent)]">*</span>
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
            <p className={`mt-1 text-[12px] ${VISION_STATUS_WARN} px-2 py-1`}>
              {errors.region}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
              매장·쇼룸·서비스 지역을 알려 주세요.
            </p>
          )}
        </label>
      ) : null}

      {activeId === "topic" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--vision-ink)]">
            STEP 3 · 오늘의 주제{" "}
            <span className="text-[var(--vision-accent)]">*</span>
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
            <p className={`mt-1 text-[12px] ${VISION_STATUS_WARN} px-2 py-1`}>
              {errors.topic}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
              검색어가 아니라, 오늘 쓸 이야기를 한 줄로 적어도 됩니다.
            </p>
          )}
        </label>
      ) : null}

      {activeId === "scene" ? (
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--vision-ink)]">
            STEP 4 · 현장 한 줄{" "}
            <span className="text-[11px] font-normal text-[var(--vision-muted)]">
              (권장)
            </span>
          </span>
          <input
            className={fieldClass}
            value={values.storeFeatures || ""}
            onChange={(e) => onPatch({ storeFeatures: e.target.value })}
            onBlur={onBlur}
            placeholder="예: 오션뷰 루프탑, 시그니처 브런치, 1:1 체험 클래스"
            autoFocus
          />
          <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
            메뉴·분위기·체험 포인트를 한 줄로. 조사·글에 바로 반영됩니다.
          </p>
        </label>
      ) : null}

      {requiredDone === 3 && filled.scene ? (
        <p className={`text-center text-[12px] font-semibold ${VISION_STATUS_OK} py-2 text-[var(--vision-accent-deep,#03a94d)]`}>
          4칸 준비 완료 — 아래에서 글을 받으세요
        </p>
      ) : null}

      {activeIndex < WRITE_FLOW_STEPS.length - 1 && filled[activeId] ? (
        <button
          type="button"
          onClick={goNext}
          className={`${VISION_GHOST_BTN} w-full !min-h-[44px] !text-[13px]`}
        >
          다음: {WRITE_FLOW_STEPS[activeIndex + 1]?.label}
        </button>
      ) : null}
    </div>
  );
}
