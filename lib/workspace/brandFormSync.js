/** 브랜드·초안 로드 시 모든 지연 폼(draft)을 committed 값으로 맞춤 */

export const BRAND_FORM_SYNC_EVENT = "briclog-brand-form-sync";

export function emitBrandFormSync(form) {
  if (typeof window === "undefined" || !form) return;
  window.dispatchEvent(
    new CustomEvent(BRAND_FORM_SYNC_EVENT, { detail: { form } })
  );
}
