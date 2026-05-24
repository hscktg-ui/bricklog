"use client";

import {
  PLAN_ORDER,
  PLANS,
  PLAN_FEATURE_LINES,
  getPlanRank,
  normalizePlanId,
} from "@/lib/billing/plans";
import { GREEN_CTA_OUTLINE } from "@/lib/ui/actionButtonStyles";

export default function PlanComparison({
  compact = false,
  currentPlanId = "free",
  onSelectPlan,
  onStart,
  variant = "app",
  paymentNote = "결제 준비 중 — 가입 후 앱에서 플랜을 확인하고 업그레이드할 수 있습니다.",
  checkoutLoading = false,
  betaActive = false,
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
          무료로 이야기 글부터 쓸 수 있습니다. 유료 전환 시{" "}
          <strong className="font-semibold text-[#4E5968]">
            매월 결제일에 자동 갱신
          </strong>
          되며, 해지는 다음 결제일 전까지 앱에서 변경할 수 있습니다.
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

  return (
    <div
      className={`flex flex-col rounded-2xl border border-[#E8EBED] bg-white p-4 transition-shadow hover:shadow-md ${
        highlight ? "ring-1 ring-[#03C75A]/15" : ""
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
          className={`mt-4 w-full ${GREEN_CTA_OUTLINE}`}
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
          className={`briclog-pressable mt-4 w-full min-h-[44px] rounded-xl py-3 text-[13px] font-bold transition active:brightness-[0.97] disabled:opacity-60 ${
            highlight
              ? "bg-[#03C75A] text-white hover:bg-[#02B350]"
              : "border border-[#E8EBED] bg-[#F7F8FA] text-[#191F28] hover:border-[#03C75A]/40"
          }`}
        >
          <span>{checkoutLoading ? "연결 중…" : "토스로 업그레이드"}</span>
        </button>
      )}
    </div>
  );
}
