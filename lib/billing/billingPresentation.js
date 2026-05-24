import {
  getBetaFullAccessUntil,
  isBetaFullAccessActive,
} from "@/lib/billing/betaAccess";
import { getTossBillingMode, isTossConfigured } from "@/lib/billing/toss/server";

function formatBetaUntilLabel(untilRaw) {
  if (!untilRaw) return "";
  const d = new Date(`${untilRaw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return untilRaw;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * Public billing UI copy (no secret env names for end users).
 */
export function getBillingPresentation(opts = {}) {
  const { forOperator = false } = opts;
  const betaActive = isBetaFullAccessActive();
  const betaUntil = getBetaFullAccessUntil();
  const betaUntilLabel = formatBetaUntilLabel(betaUntil);
  const tossConfigured = isTossConfigured();
  const tossBillingMode = getTossBillingMode();

  if (betaActive) {
    return {
      betaActive: true,
      betaUntil,
      betaUntilLabel,
      checkoutEnabled: false,
      tossConfigured,
      tossBillingMode,
      paymentStatus: "beta",
      planBadge: "스튜디오 (베타)",
      userMessage: `베타 테스터 기간입니다. ${betaUntilLabel}까지 스튜디오 전 기능을 무료로 이용할 수 있습니다.`,
      paymentNote:
        "지금은 결제 없이 모든 채널·생성 한도가 열려 있습니다. 정식 오픈 후 유료 플랜·토스페이먼츠 결제가 제공됩니다.",
      upgradeDisabledReason:
        "베타 기간에는 업그레이드 결제가 필요하지 않습니다.",
      operatorHint: forOperator
        ? "BETA_FULL_ACCESS_UNTIL · 결제 키는 정식 오픈 전까지 미설정 가능"
        : undefined,
    };
  }

  if (tossConfigured) {
    const paymentNote =
      tossBillingMode === "billing"
        ? "카드 등록 후 매월 자동결제됩니다. 다운그레이드·해지는 다음 결제일부터 적용됩니다."
        : "토스페이먼츠로 결제합니다. 업그레이드는 결제 확인 후 즉시 적용되며, 다운그레이드는 다음 결제일부터 적용됩니다.";

    return {
      betaActive: false,
      betaUntil: null,
      betaUntilLabel: null,
      checkoutEnabled: true,
      tossConfigured: true,
      tossBillingMode,
      paymentStatus: "ready",
      planBadge: null,
      userMessage: "토스페이먼츠로 플랜을 업그레이드할 수 있습니다.",
      paymentNote,
      upgradeDisabledReason: null,
      operatorHint: undefined,
    };
  }

  return {
    betaActive: false,
    betaUntil: null,
    betaUntilLabel: null,
    checkoutEnabled: false,
    tossConfigured: false,
    tossBillingMode,
    paymentStatus: "preparing",
    planBadge: null,
    userMessage:
      "유료 결제는 준비 중입니다. 무료 플랜으로도 이야기·채널 기능을 이용할 수 있습니다.",
    paymentNote:
      "스튜디오·프로 플랜 결제는 곧 연결됩니다. 오픈 알림이 필요하시면 고객센터로 문의해 주세요.",
    upgradeDisabledReason:
      "결제 시스템 점검 중입니다. 잠시 후 다시 시도하거나 문의해 주세요.",
    operatorHint: forOperator
      ? "TOSS_PAYMENTS_SECRET_KEY · NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY (docs/TOSS_PAYMENTS_SETUP.md)"
      : undefined,
  };
}
