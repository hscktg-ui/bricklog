"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { BRICLOG_FEEDBACK_SAVED_EVENT } from "@/lib/feedback/constants";
import {
  BRICLOG_DIRECTOR_LINE,
  BRAND_LEARNING_SECOND_GEN_LINE,
  FEEDBACK_NEXT_DRAFT_TOAST,
} from "@/lib/product/briclogPerspectiveCopy";

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
      setPendingNote(FEEDBACK_NEXT_DRAFT_TOAST);
      loadLearned();
    };
    window.addEventListener(BRICLOG_FEEDBACK_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(BRICLOG_FEEDBACK_SAVED_EVENT, onSaved);
  }, [activeBrandId, loadLearned]);

  if (!activeBrand) return null;

  const habits = formatBrandHabitsBrief(activeBrand);
  const serverBrief = learned?.brief;
  const generationCount = learned?.assetCounts?.generations || 0;
  const feedbackCount = learned?.assetCounts?.feedback || 0;
  const learningActive = generationCount >= 2 || feedbackCount >= 1;
  const line =
    pendingNote ||
    (learningActive && !serverBrief ? BRAND_LEARNING_SECOND_GEN_LINE : null) ||
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
      {feedbackCount > 0 || generationCount > 0 ? (
        <p className="mt-1 text-[10px] text-[#8B95A1]">
          {feedbackCount > 0 ? `누적 피드백 ${feedbackCount}건` : null}
          {feedbackCount > 0 && generationCount > 0 ? " · " : null}
          {generationCount > 0 ? `생성 ${generationCount}편` : null}
          {learningActive ? " · 학습 반영 중" : null}
        </p>
      ) : null}
    </div>
  );
}
