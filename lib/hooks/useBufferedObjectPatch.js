"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 320;
const DEFER_DRAFT_NOTIFY_MS = 500;

/** 타이핑 시 상위 상태·리렌더를 줄이기 위한 텍스트 필드 */
export const BUFFERED_FORM_TEXT_KEYS = new Set([
  "brandName",
  "region",
  "topic",
  "mainKeyword",
  "subKeyword",
  "includePhrases",
  "excludePhrases",
  "brandDescription",
  "storeFeatures",
  "benefit",
  "address",
  "phone",
  "hours",
  "parking",
  "placeHeadline",
  "placeDetailHint",
  "placeKeyFacts",
  "placePeriod",
  "placeOffer",
  "placeCtaNote",
  "instaScene",
  "instaCta",
  "competitors",
  "userWritingBrief",
]);

/**
 * 객체 폼 패치 — 텍스트 키는 디바운스, 선택·칩은 즉시 반영
 * deferParentSync: 로컬만 갱신, 상위·onDraftChange는 syncParent·디바운스 알림만
 * @param {object} values
 * @param {(next: object) => void} onChange
 * @param {{ delayMs?: number; bufferedKeys?: Set<string>; syncKey?: string; onDraftChange?: (next: object) => void; pauseFlushRef?: { current: boolean }; deferParentSync?: boolean; deferDraftNotifyMs?: number }} [options]
 */
export function useBufferedObjectPatch(values, onChange, options = {}) {
  const {
    delayMs = DEFAULT_DELAY_MS,
    bufferedKeys = BUFFERED_FORM_TEXT_KEYS,
    syncKey = "brandId",
    onDraftChange,
    pauseFlushRef,
    deferParentSync = false,
    deferDraftNotifyMs = DEFER_DRAFT_NOTIFY_MS,
  } = options;
  const [local, setLocal] = useState(values);
  const timerRef = useRef(null);
  const draftTimerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const latestRef = useRef(values);

  useEffect(() => {
    latestRef.current = local;
  }, [local]);

  useEffect(() => {
    setLocal(values);
    latestRef.current = values;
    if (!deferParentSync) onDraftChange?.(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brand 전환 시에만 외부 values 동기화
  }, [values[syncKey]]);

  const pushParent = useCallback(
    (next) => {
      if (!deferParentSync) onChangeRef.current(next);
    },
    [deferParentSync]
  );

  const notifyDraftNow = useCallback(
    (next) => {
      onDraftChange?.(next);
    },
    [onDraftChange]
  );

  const notifyDraft = useCallback(
    (next) => {
      if (!onDraftChange) return;
      if (!deferParentSync) {
        onDraftChange(next);
        return;
      }
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        draftTimerRef.current = null;
        onDraftChange(next);
      }, deferDraftNotifyMs);
    },
    [onDraftChange, deferParentSync, deferDraftNotifyMs]
  );

  const clearDraftNotify = useCallback(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(
    (next) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pushParent(next);
    },
    [pushParent]
  );

  const clearPendingFlush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (next) => {
      latestRef.current = next;
      if (pauseFlushRef?.current) return;
      clearPendingFlush();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const latest = latestRef.current;
        if (deferParentSync) notifyDraftNow(latest);
        else notifyDraft(latest);
        pushParent(latest);
      }, delayMs);
    },
    [delayMs, notifyDraft, notifyDraftNow, deferParentSync, pauseFlushRef, clearPendingFlush, pushParent]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearDraftNotify();
    },
    [clearDraftNotify]
  );

  const applyLocal = useCallback(
    (partial) => {
      setLocal((prev) => {
        const next = { ...prev, ...partial };
        latestRef.current = next;
        notifyDraftNow(next);
        if (!deferParentSync) onChangeRef.current(next);
        return next;
      });
    },
    [notifyDraftNow, deferParentSync]
  );

  const patch = useCallback(
    (partial) => {
      setLocal((prev) => {
        const next = { ...prev, ...partial };
        latestRef.current = next;
        const keys = Object.keys(partial);
        const debounce =
          keys.length > 0 && keys.every((k) => bufferedKeys.has(k));
        if (debounce) schedule(next);
        else if (deferParentSync) notifyDraftNow(next);
        else {
          notifyDraftNow(next);
          flush(next);
        }
        return next;
      });
    },
    [bufferedKeys, schedule, flush, notifyDraft, notifyDraftNow, deferParentSync]
  );

  const patchImmediate = useCallback(
    (partial) => {
      if (deferParentSync) {
        applyLocal(partial);
        return;
      }
      setLocal((prev) => {
        const next = { ...prev, ...partial };
        latestRef.current = next;
        notifyDraftNow(next);
        flush(next);
        return next;
      });
    },
    [deferParentSync, applyLocal, flush, notifyDraftNow]
  );

  const flushPending = useCallback(() => {
    clearPendingFlush();
    const latest = latestRef.current;
    if (deferParentSync) notifyDraftNow(latest);
    else {
      notifyDraftNow(latest);
      pushParent(latest);
    }
  }, [
    clearPendingFlush,
    notifyDraftNow,
    pushParent,
    deferParentSync,
  ]);

  /** 이야기 쓰기 등 — 상위 Context에 한 번만 반영 */
  const syncParent = useCallback(() => {
    clearPendingFlush();
    clearDraftNotify();
    const latest = latestRef.current;
    notifyDraftNow(latest);
    onChangeRef.current(latest);
    return latest;
  }, [clearPendingFlush, clearDraftNotify, notifyDraftNow]);

  const getValues = useCallback(() => latestRef.current, []);

  /** 브랜드 전환·초안 로드 — 로컬·draft만 통째로 교체 */
  const replaceAll = useCallback(
    (next) => {
      clearPendingFlush();
      clearDraftNotify();
      setLocal(next);
      latestRef.current = next;
      if (deferParentSync) notifyDraftNow(next);
      else {
        notifyDraftNow(next);
        onChangeRef.current(next);
      }
    },
    [
      clearPendingFlush,
      clearDraftNotify,
      deferParentSync,
      notifyDraftNow,
    ]
  );

  return {
    values: local,
    patch,
    patchImmediate,
    flushPending,
    clearPendingFlush,
    syncParent,
    replaceAll,
    getValues,
  };
}
