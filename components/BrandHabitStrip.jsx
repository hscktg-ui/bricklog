"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { BRICLOG_FEEDBACK_SAVED_EVENT } from "@/lib/feedback/constants";
import { BRICLOG_DIRECTOR_LINE } from "@/lib/product/briclogPerspectiveCopy";

export default function BrandHabitStrip({ className = "" }) {
  const { activeBrand, activeBrandId } = useBrandWorkspace();
  const [learned, setLearned] = useState(null);
  const [pendingNote, setPendingNote] = useState("");

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

  useEffect(() => {
    const onSaved = (e) => {
      if (e.detail?.brandId && e.detail.brandId !== activeBrandId) return;
      setPendingNote("방금 피드백 · 다음 글에 반영 예정");
      loadLearned();
    };
    window.addEventListener(BRICLOG_FEEDBACK_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(BRICLOG_FEEDBACK_SAVED_EVENT, onSaved);
  }, [activeBrandId, loadLearned]);

  if (!activeBrand) return null;

  const habits = formatBrandHabitsBrief(activeBrand);
  const serverBrief = learned?.brief;
  const line =
    pendingNote ||
    serverBrief ||
    habits ||
    BRICLOG_DIRECTOR_LINE;

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5 ${className}`}
      role="status"
    >
      <p className="text-[11px] font-semibold text-[#4E5968]">브랜드 기억</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">{line}</p>
      {learned?.assetCounts?.feedback > 0 ? (
        <p className="mt-1 text-[10px] text-[#8B95A1]">
          누적 피드백 {learned.assetCounts.feedback}건 · 생성{" "}
          {learned.assetCounts.generations || 0}편
        </p>
      ) : null}
    </div>
  );
}
