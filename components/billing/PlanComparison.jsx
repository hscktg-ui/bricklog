"use client";

import {
  PLAN_ORDER,
  PLANS,
  PLAN_FEATURE_LINES,
  getPlanRank,
  normalizePlanId,
} from "@/lib/billing/plans";
import { upgradeButtonLabel } from "@/lib/billing/paymentProviderUi";
import {
  VISION_CTA_ACCENT,
  VISION_CTA_OUTLINE,
  VISION_GHOST_BTN,
  VISION_PANEL,
} from "@/lib/landing/vision2030Styles";

export default function PlanComparison({
  compact = false,
  currentPlanId = "free",
  onSelectPlan,
  onStart,
  variant = "app",
  paymentNote = "결제 시스템 준비 중 — 베타 기간에는 무료로 이용할 수 있습니다.",
  checkoutLoading = false,
  betaActive = false,
  paymentStatus = null,
  providerLabel = "KG이니시스",
  inicisReview = false,
}) {
  const isLanding = variant === "landing";

  return (
    <div>
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-3 @min-[640px]:grid-cols-3"
            : isLanding
              ? "flex flex-col gap-4 @min-[720px]:grid @min-[720px]:grid-cols-3 @min-[720px]:gap-4"
              : "grid grid-cols-1 gap-4 @min-[720px]:grid-cols-3"
        }
      >
        {PLAN_ORDER.map((id) => (
          <PlanCard
            key={id}
            plan={PLANS[id]}
            features={PLAN_FEATURE_LINES[id]}
            compact={compact}
            currentPlanId={currentPlanId}
            onSelect={onSelectPlan}
            onStart={onStart}
            variant={variant}
            checkoutLoading={checkoutLoading}
            betaActive={betaActive}
            paymentStatus={paymentStatus}
            providerLabel={providerLabel}
            inicisReview={inicisReview}
          />
        ))}
      </div>
      {paymentNote && !isLanding && (
        <p
          className={`text-center text-[var(--muted,#8B95A1)] ${
            compact ? "mt-3 text-[10px]" : "mt-5 text-[11px]"
          }`}
        >
          {paymentNote}
        </p>
      )}
      {isLanding && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-[#8B95A1]">
          무료로 이야기 글부터 쓸 수 있습니다. 유료 전환은{" "}
          <strong className="font-semibold text-[#4E5968]">KG이니시스</strong>
          를 통해 진행되며, 심사 완료 후{" "}
          <strong className="font-semibold text-[#4E5968]">
            매월 결제일에 자동 갱신
          </strong>
          됩니다. 해지는 다음 결제일 전까지 앱에서 변경할 수 있습니다.
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  features,
  compact,
  currentPlanId,
  onSelect,
  onStart,
  variant,
  checkoutLoading,
  betaActive = false,
  paymentStatus = null,
  providerLabel = "KG이니시스",
  inicisReview = false,
}) {
  const highlight = plan.highlight;
  const isFree = plan.id === "free";
  const current = normalizePlanId(currentPlanId);
  const isCurrent =
    current === plan.id || (betaActive && plan.id === "studio");
  const isLanding = variant === "landing";
  const canUpgrade =
    !isLanding &&
    !betaActive &&
    onSelect &&
    !isFree &&
    getPlanRank(plan.id) > getPlanRank(current);

  const handleLandingCta = () => {
    onStart?.();
  };

  const upgradeLabel = upgradeButtonLabel(
    Boolean(onSelect) && !inicisReview,
    inicisReview ? "inicis_review" : paymentStatus
  );

  return (
    <div
      className={`flex flex-col p-4 transition-shadow hover:shadow-md ${VISION_PANEL} ${
        highlight ? "ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]" : ""
      } ${compact ? "p-3" : ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8B95A1]">
        {plan.labelEn}
      </p>
      <p
        className={`font-bold text-[#191F28] ${
          compact ? "text-[14px]" : "text-[17px]"
        }`}
      >
        {plan.label}
      </p>
      {plan.marketingAlias && plan.marketingAlias !== plan.label ? (
        <p className="mt-0.5 text-[11px] font-medium text-[#8B95A1]">
          {plan.marketingAlias} 요금제
        </p>
      ) : null}
      <p
        className={`mt-1 font-bold ${
          isFree ? "text-[#4E5968]" : "text-[#03A94D]"
        } ${compact ? "text-[18px]" : "text-[22px]"}`}
      >
        {plan.displayPriceShort}
        {!isFree && (
          <span className="text-[12px] font-medium text-[#8B95A1]">/월</span>
        )}
      </p>
      <ul className={`mt-3 flex-1 space-y-2 ${compact ? "space-y-1.5" : ""}`}>
        {features.map((f) => (
          <li
            key={f}
            className={`flex gap-2 leading-snug text-[#4E5968] ${
              compact ? "text-[11px]" : "text-[12px]"
            }`}
          >
            <span className="shrink-0 font-bold text-[#03C75A]">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isLanding && (
        <button
          type="button"
          onClick={handleLandingCta}
          className={`mt-4 w-full ${VISION_CTA_OUTLINE}`}
        >
          <span>{isFree ? "무료로 시작" : "가입 후 이용"}</span>
        </button>
      )}

      {!isLanding && isCurrent && (
        <p className="mt-4 text-center text-[11px] font-semibold text-[#03A94D]">
          {betaActive && plan.id === "studio" ? "베타 이용 중" : "현재 플랜"}
        </p>
      )}
      {canUpgrade && (
        <button
          type="button"
          disabled={checkoutLoading}
          onClick={() => onSelect(plan.id)}
          className={`briclog-pressable mt-4 w-full disabled:opacity-60 ${
            highlight
              ? `${VISION_CTA_ACCENT} !min-h-[44px]`
              : `${VISION_GHOST_BTN} !min-h-[44px] w-full justify-center`
          }`}
        >
          <span>
            {checkoutLoading
              ? "연결 중…"
              : inicisReview
                ? "심사 후 결제 연결"
                : upgradeLabel.replace("KG이니시스", providerLabel)}
          </span>
        </button>
      )}
    </div>
  );
}
