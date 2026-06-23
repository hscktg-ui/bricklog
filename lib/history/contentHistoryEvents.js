/** 브랜드·히스토리 목록 갱신 SSOT */
export const CONTENT_HISTORY_SAVED_EVENT = "briclog-content-history-saved";

/**
 * @param {{ brandId?: string|null, channel?: string, source?: string }} detail
 */
export function notifyContentHistorySaved(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CONTENT_HISTORY_SAVED_EVENT, { detail })
  );
}
