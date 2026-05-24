/** 브랜드 창고(펼치기) UI — 콘텐츠 기록이 이 수 이상일 때만 노출 */
export const BRAND_WAREHOUSE_MIN_LOGS = 5;

export function shouldShowBrandWarehouse(contentLogCount, { brandCount = 0 } = {}) {
  if (contentLogCount >= BRAND_WAREHOUSE_MIN_LOGS) return true;
  return brandCount >= 2;
}
