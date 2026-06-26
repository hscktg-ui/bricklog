/**
 * 결제 PG — 고객 UI·카피 SSOT (백엔드 연동은 provider별 모듈).
 * BRICLOG_PG_PROVIDER=inicis | toss (기본 inicis)
 */

export const PG_INICIS_LABEL = "KG이니시스";
export const PG_INICIS_FULL = "KG이니시스(KG Inicis)";

/** @returns {"inicis"|"toss"} */
export function getPaymentProviderId() {
  const raw = (process.env.BRICLOG_PG_PROVIDER || "inicis").trim().toLowerCase();
  return raw === "toss" ? "toss" : "inicis";
}

export function isInicisProvider() {
  return getPaymentProviderId() === "inicis";
}

/** 이니시스 가맹·전자결제 심사 중 — 결제창 미연결 */
export function isInicisReviewPending() {
  if (!isInicisProvider()) return false;
  if (process.env.BRICLOG_PG_INICIS_REVIEW === "false") return false;
  return process.env.BRICLOG_PG_INICIS_REVIEW !== "live";
}

export function getPaymentProviderLabel() {
  return isInicisProvider() ? PG_INICIS_LABEL : "토스페이먼츠";
}

/** @param {{ checkoutEnabled?: boolean, inicisReview?: boolean }} [ctx] */
export function getUpgradeButtonLabel(ctx = {}) {
  if (ctx.inicisReview) return "심사 후 결제 연결";
  if (ctx.checkoutEnabled) return `${getPaymentProviderLabel()}로 업그레이드`;
  return "업그레이드";
}

/** 고객용 결제창 안내 한 줄 */
export function getCheckoutWindowHint() {
  const label = getPaymentProviderLabel();
  if (isInicisProvider() && isInicisReviewPending()) {
    return `${PG_INICIS_FULL} 전자결제 심사가 진행 중입니다. 심사 완료 후 결제창이 연결됩니다.`;
  }
  return `상위 플랜을 고르면 ${label} 결제창이 열리고, 업그레이드는 결제 후 바로 반영됩니다.`;
}
