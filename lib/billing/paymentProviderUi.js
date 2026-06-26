/** 클라이언트·서버 공용 — PG 표기 (비밀 env 없음) */

export const PG_INICIS_LABEL = "KG이니시스";

export function upgradeButtonLabel(checkoutEnabled, paymentStatus) {
  if (paymentStatus === "inicis_review") return "심사 후 결제 연결";
  if (checkoutEnabled) return `${PG_INICIS_LABEL}로 업그레이드`;
  return "업그레이드";
}

export function checkoutWindowHint(checkoutEnabled, paymentStatus, providerLabel) {
  const label = providerLabel || PG_INICIS_LABEL;
  if (paymentStatus === "inicis_review") {
    return `${label}(KG Inicis) 전자결제 심사가 진행 중입니다. 심사 완료 후 결제창이 연결됩니다.`;
  }
  if (checkoutEnabled) {
    return `상위 플랜을 고르면 ${label} 결제창이 열리고, 업그레이드는 결제 후 바로 반영됩니다.`;
  }
  return null;
}
