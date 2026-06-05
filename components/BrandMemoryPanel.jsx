"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { EMOJI_DENSITY_OPTIONS } from "@/lib/emoji/emojiDensityEngine";
import { BLOG_TONE_OPTIONS } from "@/lib/constants";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";

const fieldClass =
  "w-full rounded-md border border-[#E8EBED] bg-white px-2 py-1.5 text-[12px] text-[#191F28] focus:border-[#03C75A] focus:outline-none";

export default function BrandMemoryPanel({
  defaultOpen = false,
  summaryLine,
  embedded = false,
}) {
  const { activeBrand, activeBrandId, updateActiveBrand } = useBrandWorkspace();
  const [open, setOpen] = useState(defaultOpen);
  const [learned, setLearned] = useState(null);

  const loadLearned = useCallback(async () => {
    if (!activeBrandId) {
      setLearned(null);
      return;
    }
    try {
      const data = await fetchWithAuth(
        `/api/memory/brand-learning?brandId=${encodeURIComponent(activeBrandId)}`
      );
      setLearned(data);
    } catch {
      setLearned(null);
    }
  }, [activeBrandId]);

  useEffect(() => {
    loadLearned();
  }, [loadLearned]);

  if (!activeBrand) return null;

  const patch = (key, val) =>
    updateActiveBrand({ ...activeBrand, [key]: val });

  const habitsSummary = formatBrandHabitsBrief(activeBrand);
  const editCount = activeBrand.learning?.editCount || 0;

  const wrap = embedded ? "" : "border-b border-[#E8EBED] px-3 pb-3";

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-0.5 text-left"
      >
        <span className="flex w-full items-center justify-between text-[12px] font-semibold text-[#191F28]">
          <span>
            {embedded ? "브랜드 습관" : "브랜드 기억·습관"}
            {editCount > 0 && (
              <span className="ml-1 font-normal text-[#03A94D]">
                · {editCount}회
              </span>
            )}
          </span>
          <span className="text-[11px] font-normal text-[#8B95A1]">
            {open ? "접기" : "펼치기"}
          </span>
        </span>
        {!open && summaryLine && (
          <span className="line-clamp-2 text-[12px] leading-snug text-[#4E5968]">
            {summaryLine}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-[#E8EBED] bg-[#F7F8FA] p-2">
          <p className="text-[10px] leading-snug text-[#8B95A1]">
            이 브랜드만의 화자·문체·금지어·문장 습관입니다. 검수·피드백이
            쌓이면 다음 「조사 후 글 받기」에 자동 반영됩니다.
          </p>
          <p className="text-[10px] font-medium text-[#4E5968]">
            이 브랜드에 쌓인 기록은 계속 이어집니다
          </p>
          {learned?.assetCounts?.generations > 0 ? (
            <p className="text-[10px] text-[#4E5968]">
              서버 기록 — 생성 {learned.assetCounts.generations}편
              {learned.assetCounts.feedback > 0
                ? ` · 피드백 ${learned.assetCounts.feedback}건`
                : ""}
            </p>
          ) : null}
          {learned?.brief ? (
            <p className="rounded-md bg-white px-2 py-1.5 text-[10px] leading-relaxed text-[#4E5968]">
              <span className="font-semibold text-[#03A94D]">서버 학습</span>{" "}
              {learned.brief}
            </p>
          ) : null}
          {habitsSummary ? (
            <p className="rounded-md bg-white px-2 py-1.5 text-[10px] leading-relaxed text-[#4E5968]">
              <span className="font-semibold text-[#03A94D]">로컬 누적</span>{" "}
              {habitsSummary}
            </p>
          ) : !learned?.brief ? (
            <p className="text-[10px] text-[#B0B8C1]">
              아직 누적 습관이 없습니다. 아래 설정과 검수·피드백으로 쌓입니다.
            </p>
          ) : null}
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            문체
            <select
              className={`${fieldClass} mt-0.5`}
              value={activeBrand.tone || "emotional"}
              onChange={(e) => patch("tone", e.target.value)}
            >
              {BLOG_TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            금지어 (쉼표 구분)
            <textarea
              className={`${fieldClass} mt-0.5 min-h-[48px]`}
              value={activeBrand.forbiddenWords || ""}
              onChange={(e) => patch("forbiddenWords", e.target.value)}
              placeholder="소개해드릴게요, 추천드립니다"
            />
          </label>
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            이모지 밀도
            <select
              className={`${fieldClass} mt-0.5`}
              value={activeBrand.emojiDensity || activeBrand.emojiLevel || "low"}
              onChange={(e) => patch("emojiDensity", e.target.value)}
            >
              {EMOJI_DENSITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-medium text-[#8B95A1]">
            문장 길이 습관
            <select
              className={`${fieldClass} mt-0.5`}
              value={activeBrand.preferredSentenceStyle || "medium"}
              onChange={(e) => patch("preferredSentenceStyle", e.target.value)}
            >
              <option value="short">짧게</option>
              <option value="medium">보통</option>
              <option value="long">길게</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
