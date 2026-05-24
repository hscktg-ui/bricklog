"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BRAND_FORM_SYNC_EVENT,
} from "@/lib/workspace/brandFormSync";

/**
 * 채널 브리프 — Context(blogInput 등)는 생성 CTA에서만 flush
 * @param {object} committedValues
 * @param {(next: object) => void} setCommitted
 * @param {string} [syncKey]
 */
export function useDeferredWorkspaceForm(
  committedValues,
  setCommitted,
  syncKey = "brandId"
) {
  const [draft, setDraft] = useState(committedValues);
  const formApiRef = useRef(null);
  const committedRef = useRef(committedValues);
  committedRef.current = committedValues;

  const applyExternalForm = useCallback((form) => {
    if (!form) return;
    setDraft(form);
    formApiRef.current?.replaceAll?.(form);
  }, []);

  useEffect(() => {
    applyExternalForm(committedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 브랜드 전환 시 committed만 동기화
  }, [committedValues[syncKey], applyExternalForm]);

  useEffect(() => {
    const onBrandSync = (e) => {
      const form = e.detail?.form;
      if (!form) return;
      const cur = committedRef.current;
      if (cur?.brandId && form.brandId && cur.brandId !== form.brandId) {
        applyExternalForm(form);
        return;
      }
      if (form.brandId === cur?.brandId || !cur?.brandId) {
        applyExternalForm(form);
      }
    };
    window.addEventListener(BRAND_FORM_SYNC_EVENT, onBrandSync);
    return () => window.removeEventListener(BRAND_FORM_SYNC_EVENT, onBrandSync);
  }, [applyExternalForm]);

  const flushToCommitted = useCallback(() => {
    const next =
      formApiRef.current?.syncParent?.() ??
      formApiRef.current?.getValues?.() ??
      draft;
    setCommitted(next);
    setDraft(next);
    return next;
  }, [draft, setCommitted]);

  const patchDraft = useCallback((partial) => {
    formApiRef.current?.patchImmediate?.(partial);
  }, []);

  return {
    draft,
    setDraft,
    formApiRef,
    flushToCommitted,
    patchDraft,
    applyExternalForm,
  };
}
