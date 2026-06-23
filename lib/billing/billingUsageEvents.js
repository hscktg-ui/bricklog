/** 생성·결제 후 usage UI 동기화 */
export const BILLING_USAGE_REFRESH_EVENT = "briclog-billing-usage-refresh";

export function requestBillingUsageRefresh(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BILLING_USAGE_REFRESH_EVENT, { detail })
  );
}
