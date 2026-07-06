"use client";

import {
  VISION_EYEBROW,
  VISION_STATUS_NEUTRAL,
} from "@/lib/landing/vision2030Styles";

/**
 * 심플 작업실 — 주제·키워드 안내 (글 유형에 따라 분기)
 */
export default function KeywordTopicGuide({ compact = false, contract = null }) {
  const segmented = contract?.density === "segmented";
  const visit = contract?.visitToneAllowed;

  return (
    <div className={`${VISION_STATUS_NEUTRAL} px-3 py-2.5`} role="note">
      <p className={`${VISION_EYEBROW} !normal-case !tracking-normal text-[var(--vision-ink)]`}>
        주제만 적어도 됩니다
      </p>
      <ul
        className={`mt-1.5 space-y-1 text-[12px] leading-relaxed text-[var(--vision-muted)] ${
          compact ? "text-[11px]" : ""
        }`}
      >
        <li>
          <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
            주제
          </span>{" "}
          — 오늘 쓸 이야기·설명할 항목 (검색어 아님)
        </li>
        {segmented ? (
          <li>
            <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
              구체 포인트
            </span>{" "}
            — 제품·메뉴·기능 중 2가지 (항목별로 쓰입니다)
          </li>
        ) : visit ? (
          <li>
            <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
              현장 한 줄
            </span>{" "}
            — 메뉴·분위기·체험 포인트 (조사에 반영)
          </li>
        ) : (
          <li>
            <span className="font-semibold text-[var(--vision-accent-deep,#03a94d)]">
              한 줄 보강
            </span>{" "}
            — 가격·혜택·특징·상담 포인트 (선택)
          </li>
        )}
        <li>
          <span className="font-semibold text-[var(--vision-muted)]">키워드</span>{" "}
          — 비워 두면 주제에서 자동. 「더 맞추기」에서 수정 가능
        </li>
      </ul>
    </div>
  );
}
