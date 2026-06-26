import {
  getBetaFullAccessUntil,
  isBetaFullAccessActive,
} from "@/lib/billing/betaAccess";
import {
  getPaymentProviderId,
  getPaymentProviderLabel,
  isInicisProvider,
  isInicisReviewPending,
  PG_INICIS_FULL,
} from "@/lib/billing/paymentProvider";
import { getTossBillingMode, isTossConfigured } from "@/lib/billing/toss/server";
import { isBriclogResetPaymentPaused } from "@/lib/config/resetLaunchFlags";

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
  const providerId = getPaymentProviderId();
  const providerLabel = getPaymentProviderLabel();
  const tossConfigured = isTossConfigured();
  const tossBillingMode = getTossBillingMode();
  const inicisReview = isInicisReviewPending();

  const baseMeta = {
    providerId,
    providerLabel,
    inicisReview,
    tossConfigured,
    tossBillingMode,
  };

  if (isBriclogResetPaymentPaused()) {
    return {
      ...baseMeta,
      betaActive: true,
      betaUntil: null,
      betaUntilLabel: null,
      checkoutEnabled: false,
      paymentStatus: "quality_reset",
      planBadge: "품질 안정화",
      userMessage:
        "지금은 콘텐츠 품질 안정화 기간입니다. 베타 무료 이용만 가능하며 유료 결제는 잠시 중단됩니다.",
      paymentNote:
        "품질 안정화가 끝날 때까지 결제·업그레이드는 받지 않습니다. 기존 베타 계정은 무료로 계속 이용할 수 있습니다." +
        (isInicisProvider()
          ? ` 유료 전환 시 ${PG_INICIS_FULL} PG가 연결됩니다${inicisReview ? " (현재 심사 중)" : ""}.`
          : ""),
      upgradeDisabledReason: "품질 안정화 기간에는 결제를 받지 않습니다.",
      operatorHint: forOperator
        ? "BRICLOG_RESET_PAYMENT_PAUSED · BRICLOG_RESET_QUALITY"
        : undefined,
    };
  }
  const betaActive = isBetaFullAccessActive();
  const betaUntil = getBetaFullAccessUntil();
  const betaUntilLabel = formatBetaUntilLabel(betaUntil);

  if (betaActive) {
    return {
      ...baseMeta,
      betaActive: true,
      betaUntil,
      betaUntilLabel,
      checkoutEnabled: false,
      paymentStatus: "beta",
      planBadge: "스튜디오 (베타)",
      userMessage: `베타 테스터 기간입니다. ${betaUntilLabel}까지 스튜디오 전 기능을 무료로 이용할 수 있습니다.`,
      paymentNote: inicisReview
        ? `지금은 결제 없이 모든 채널·생성 한도가 열려 있습니다. 정식 오픈 후 ${PG_INICIS_FULL} 결제가 연결됩니다. (현재 PG 심사 중)`
        : `지금은 결제 없이 모든 채널·생성 한도가 열려 있습니다. 정식 오픈 후 ${providerLabel} 결제가 제공됩니다.`,
      upgradeDisabledReason:
        "베타 기간에는 업그레이드 결제가 필요하지 않습니다.",
      operatorHint: forOperator
        ? "BETA_FULL_ACCESS_UNTIL · BRICLOG_PG_PROVIDER=inicis"
        : undefined,
    };
  }

  if (inicisReview) {
    return {
      ...baseMeta,
      betaActive: false,
      betaUntil: null,
      betaUntilLabel: null,
      checkoutEnabled: false,
      paymentStatus: "inicis_review",
      planBadge: "결제 심사 중",
      userMessage: `${PG_INICIS_FULL} 전자결제 심사가 진행 중입니다. 심사 완료 후 유료 플랜 결제가 연결됩니다.`,
      paymentNote:
        "브랜드·스튜디오 플랜 결제는 KG이니시스 심사 통과 후 순차 오픈됩니다. 무료 플랜으로도 이야기·플레이스·인스타를 이용할 수 있습니다.",
      upgradeDisabledReason:
        "KG이니시스 PG 심사 중이라 결제창을 열 수 없습니다. 심사 완료 후 다시 시도해 주세요.",
      operatorHint: forOperator
        ? "BRICLOG_PG_PROVIDER=inicis · BRICLOG_PG_INICIS_REVIEW (live 전까지 checkout off)"
        : undefined,
    };
  }

  if (providerId === "toss" && tossConfigured) {
    const paymentNote =
      tossBillingMode === "billing"
        ? `카드 등록 후 매월 자동결제됩니다. (${providerLabel}) 다운그레이드·해지는 다음 결제일부터 적용됩니다.`
        : `${providerLabel}로 결제합니다. 업그레이드는 결제 확인 후 즉시 적용되며, 다운그레이드는 다음 결제일부터 적용됩니다.`;

    return {
      ...baseMeta,
      betaActive: false,
      betaUntil: null,
      betaUntilLabel: null,
      checkoutEnabled: true,
      paymentStatus: "ready",
      planBadge: null,
      userMessage: `${providerLabel}로 플랜을 업그레이드할 수 있습니다.`,
      paymentNote,
      upgradeDisabledReason: null,
      operatorHint: undefined,
    };
  }

  if (isInicisProvider()) {
    return {
      ...baseMeta,
      betaActive: false,
      betaUntil: null,
      betaUntilLabel: null,
      checkoutEnabled: false,
      paymentStatus: "preparing",
      planBadge: null,
      userMessage:
        "유료 결제 연결을 준비 중입니다. 무료 플랜으로도 이야기·채널 기능을 이용할 수 있습니다.",
      paymentNote: `${PG_INICIS_FULL} 연동 설정이 마무리되면 결제가 가능합니다.`,
      upgradeDisabledReason:
        "결제 시스템 연결 중입니다. 잠시 후 다시 시도하거나 문의해 주세요.",
      operatorHint: forOperator
        ? "BRICLOG_PG_INICIS_* · docs/INICIS_PAYMENTS_SETUP.md (예정)"
        : undefined,
    };
  }

  return {
    ...baseMeta,
    betaActive: false,
    betaUntil: null,
    betaUntilLabel: null,
    checkoutEnabled: false,
    paymentStatus: "preparing",
    planBadge: null,
    userMessage:
      "유료 결제는 준비 중입니다. 무료 플랜으로도 이야기·채널 기능을 이용할 수 있습니다.",
    paymentNote:
      "스튜디오·프로 플랜 결제는 곧 연결됩니다. 오픈 알림이 필요하시면 고객센터로 문의해 주세요.",
    upgradeDisabledReason:
      "결제 시스템 점검 중입니다. 잠시 후 다시 시도하거나 문의해 주세요.",
    operatorHint: forOperator
      ? "BRICLOG_PG_PROVIDER · 결제 키 미설정"
      : undefined,
  };
}
