/** 브랜드 창고 — 항상 노출 (Steve Jobs: 핵심 기능은 숨기지 않는다) */
export const BRAND_WAREHOUSE_MIN_LOGS = 0;

export function shouldShowBrandWarehouse(_contentLogCount = 0, _opts = {}) {
  return true;
}
