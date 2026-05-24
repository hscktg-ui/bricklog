"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  INDUSTRY_QUICK_PICKS,
  INDUSTRY_MORE_PICKS,
} from "@/lib/brand/industryAutocomplete";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

const chipClass = (active) =>
  `rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
    active
      ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
      : "border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#03C75A]/35"
  }`;

const COMMIT_MS = 400;

/**
 * 업종 입력 — datalist 제거, 대표 칩 + 직접 입력, 타이핑은 디바운스
 */
function IndustryInput({ value = "", onChange }) {
  const [local, setLocal] = useState(value);
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef(null);
  const commitTimer = useRef(null);

  useEffect(() => {
    setLocal(value || "");
  }, [value]);

  const flushCommit = useCallback(
    (next) => {
      if (commitTimer.current) {
        clearTimeout(commitTimer.current);
        commitTimer.current = null;
      }
      onChange(next);
    },
    [onChange]
  );

  const scheduleCommit = useCallback(
    (next) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => {
        commitTimer.current = null;
        onChange(next);
      }, COMMIT_MS);
    },
    [onChange]
  );

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [moreOpen]);

  const pick = (label) => {
    setLocal(label);
    setMoreOpen(false);
    flushCommit(label);
  };

  const onInputChange = (e) => {
    const next = e.target.value;
    setLocal(next);
    scheduleCommit(next);
  };

  const onBlur = () => {
    flushCommit(local);
    setMoreOpen(false);
  };

  const trimmed = local.trim();
  const showCustom =
    trimmed &&
    !INDUSTRY_QUICK_PICKS.includes(trimmed) &&
    !INDUSTRY_MORE_PICKS.includes(trimmed);

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {INDUSTRY_QUICK_PICKS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => pick(label)}
            className={chipClass(trimmed === label)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={chipClass(moreOpen)}
          aria-expanded={moreOpen}
        >
          {moreOpen ? "접기" : "더 보기"}
        </button>
      </div>

      {moreOpen && (
        <div className="max-h-[120px] overflow-y-auto rounded-lg border border-[#E8EBED] bg-[#FAFBFC] p-2">
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_MORE_PICKS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => pick(label)}
                className={chipClass(trimmed === label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        className={fieldClass}
        value={local}
        onChange={onInputChange}
        onBlur={onBlur}
        placeholder="직접 입력 (예: 네일샵, 펜션)"
        autoComplete="off"
      />

      {showCustom && (
        <p className="text-[11px] text-[#8B95A1]">
          「{trimmed}」로 저장됩니다
        </p>
      )}
    </div>
  );
}

export default memo(IndustryInput);
