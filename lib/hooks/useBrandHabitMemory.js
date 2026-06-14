"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { BRICLOG_FEEDBACK_SAVED_EVENT } from "@/lib/feedback/constants";
import { FEEDBACK_NEXT_DRAFT_TOAST } from "@/lib/product/briclogPerspectiveCopy";
import {
  BRAND_HABIT_SAVED,
  BRAND_HABIT_SAVING,
  isBrandHabitLearningActive,
} from "@/lib/brands/brandHabitUx";

const SAVE_DEBOUNCE_MS = 420;

/**
 * 브랜드 습관 — 서버 학습 조회 + 필드 자동 저장
 */
export function useBrandHabitMemory() {
  const { activeBrand, activeBrandId, updateActiveBrand } = useBrandWorkspace();
  const [learned, setLearned] = useState(null);
  const [pendingNote, setPendingNote] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [brandDraft, setBrandDraft] = useState(null);
  const saveTimerRef = useRef(null);
  const draftRef = useRef(null);

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

  useEffect(() => {
    draftRef.current = null;
    setSaveState("idle");
    setBrandDraft(activeBrand);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [activeBrandId]);

  useEffect(() => {
    if (saveState === "saved" && activeBrand) {
      setBrandDraft(activeBrand);
    }
  }, [saveState, activeBrand]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const flushSave = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft || !activeBrand) return;
    draftRef.current = null;
    setSaveState("saving");
    try {
      await updateActiveBrand(draft);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  }, [activeBrand, updateActiveBrand]);

  const patchField = useCallback(
    (key, value) => {
      if (!activeBrand) return;
      setBrandDraft((prev) => {
        const base = prev || activeBrand;
        const next = { ...base, [key]: value };
        draftRef.current = next;
        return next;
      });
      setSaveState("pending");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [activeBrand, flushSave]
  );

  const counts = learned?.assetCounts || {};
  const learningActive = isBrandHabitLearningActive(counts);

  const saveLabel =
    saveState === "saving"
      ? BRAND_HABIT_SAVING
      : saveState === "saved" || saveState === "pending"
        ? BRAND_HABIT_SAVED
        : "";

  return {
    activeBrand,
    brandDraft: brandDraft || activeBrand,
    activeBrandId,
    learned,
    pendingNote,
    setPendingNote,
    loadLearned,
    patchField,
    saveLabel,
    learningActive,
    counts,
  };
}
