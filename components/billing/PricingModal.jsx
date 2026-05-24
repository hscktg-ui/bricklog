"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import PlanComparison from "@/components/billing/PlanComparison";
import SubscriptionPanel from "@/components/billing/SubscriptionPanel";
import { useTossCheckout } from "@/components/billing/TossCheckout";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { getPlanRank, normalizePlanId } from "@/lib/billing/plans";

export default function PricingModal({ open, onClose, onToast, onPlanActivated }) {
  const [billingStatus, setBillingStatus] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const { startCheckout, loading } = useTossCheckout({ onToast });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/billing/status").then((r) => r.json()),
      fetchWithAuth("/api/billing/subscription").catch(() => null),
    ])
      .then(([statusData, subData]) => {
        if (cancelled) return;
        setBillingStatus(statusData?.billing ?? null);
        if (subData?.ok) setSubscription(subData.subscription);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const effectivePlan = normalizePlanId(
    subscription?.effectivePlanId || "free"
  );

  const handleSelectPlan = useCallback(
    async (planId) => {
      const target = normalizePlanId(planId);
      if (getPlanRank(target) <= getPlanRank(effectivePlan)) {
        onToast?.(
          "현재 플랜보다 낮은 플랜은 아래 「구독 관리」에서 다음 결제일부터 변경할 수 있습니다.",
          "info"
        );
        return;
      }

      if (billingStatus?.upgradeDisabledReason) {
        onToast?.(billingStatus.upgradeDisabledReason, "info");
        return;
      }

      if (!billingStatus?.checkoutEnabled) {
        onToast?.(
          billingStatus?.userMessage ||
            "지금은 결제를 이용할 수 없습니다. 무료·베타 혜택으로 계속 이용해 주세요.",
          "info"
        );
        return;
      }

      const changeKind = effectivePlan === "free" ? "subscribe" : "upgrade";
      await startCheckout(planId, changeKind);
      onPlanActivated?.();
    },
    [billingStatus, effectivePlan, startCheckout, onToast, onPlanActivated]
  );

  if (!open) return null;

  const checkoutReady = Boolean(billingStatus?.checkoutEnabled);
  const betaActive = Boolean(
    billingStatus?.betaActive || subscription?.betaPeriod
  );
  const paymentNote =
    billingStatus?.paymentNote ||
    billingStatus?.userMessage ||
    "플랜 안내를 불러오는 중입니다.";

  const pendingNote =
    subscription?.pendingPlan || subscription?.cancelAtPeriodEnd
      ? subscription.cancelAtPeriodEnd
        ? "구독 해지가 예약되어 있습니다."
        : `다음 결제일부터 ${subscription.pendingPlanLabel} 플랜 예정`
      : null;

  const showCurrentPlan = Boolean(subscription?.planLabel);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="pricing-modal-title"
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#03A94D]">
              BRICLOG 요금제
            </p>
            <h2
              id="pricing-modal-title"
              className="mt-1 text-[20px] font-bold text-[#191F28]"
            >
              플랜 변경 · 결제
            </h2>
            {showCurrentPlan && (
              <p className="mt-1 text-[12px] text-[#4E5968]">
                현재: <strong>{subscription.planLabel}</strong>
                {subscription.bypassBilling && subscription.betaPeriod && (
                  <span className="text-[#03A94D]">
                    {" "}
                    · {billingStatus?.betaUntilLabel || "베타"}까지 무료
                  </span>
                )}
                {pendingNote && (
                  <span className="text-[#8A6D00]"> · {pendingNote}</span>
                )}
              </p>
            )}
            {betaActive && !subscription?.planLabel && (
              <p className="mt-1 text-[12px] font-semibold text-[#03A94D]">
                베타 테스터 · 스튜디오 전 기능
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-[#8B95A1] hover:bg-[#F7F8FA]"
            aria-label="닫기"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-[#4E5968]">
          이야기·플레이스·인스타·비주얼을 한 브랜드 톤으로 이어 만들 수 있습니다.
          {checkoutReady ? (
            <>
              {" "}
              상위 플랜을 고르면 <strong>토스페이먼츠 결제창</strong>이 열리고,
              업그레이드는 결제 후 바로 반영됩니다.
            </>
          ) : (
            <> 베타·무료 혜택으로도 채널을 이용할 수 있습니다.</>
          )}
        </p>

        {betaActive && (
          <div className="mt-4 rounded-xl border border-[#03C75A]/30 bg-[#F0FFF5] px-4 py-3 text-[12px] leading-relaxed text-[#03A94D]">
            <p className="font-semibold text-[#191F28]">베타 테스터</p>
            <p className="mt-1">
              {billingStatus?.userMessage ||
                "베타 기간 동안 스튜디오 기능을 결제 없이 이용할 수 있습니다."}
            </p>
          </div>
        )}

        {!checkoutReady && !betaActive && (
          <div className="mt-4 rounded-xl border border-[#E8EBED] bg-[#F7F8FA] px-4 py-3 text-[12px] leading-relaxed text-[#4E5968]">
            <p className="font-semibold text-[#191F28]">결제 준비 중</p>
            <p className="mt-1">{paymentNote}</p>
          </div>
        )}

        <div className="mt-5">
          <PlanComparison
            compact
            currentPlanId={effectivePlan}
            onSelectPlan={checkoutReady ? handleSelectPlan : undefined}
            paymentNote={paymentNote}
            checkoutLoading={loading}
            betaActive={betaActive}
          />
        </div>

        {!betaActive && (
          <div className="mt-6 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-4">
            <p className="text-[12px] font-semibold text-[#191F28]">구독 관리</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
              다운그레이드·해지 예약은 다음 결제일부터 적용됩니다.
            </p>
            <div className="mt-3">
              <SubscriptionPanel
                compact
                onUpgradePlans={() => {}}
                onToast={onToast}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-[#191F28] py-3 text-[14px] font-semibold text-white hover:bg-[#2d3339] disabled:opacity-60"
        >
          {loading ? "결제창 연결 중…" : "닫기"}
        </button>
      </div>
    </div>
  );
}
