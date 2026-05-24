"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { useTossCheckout } from "@/components/billing/TossCheckout";
import {
  PLAN_ORDER,
  PLANS,
  getPlanRank,
  normalizePlanId,
} from "@/lib/billing/plans";

function formatKoDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export default function SubscriptionPanel({
  onUpgradePlans,
  onToast,
  compact = false,
}) {
  const [sub, setSub] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { startCheckout, loading: checkoutLoading } = useTossCheckout({
    onToast,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth("/api/billing/subscription");
      if (data?.ok) {
        setSub(data.subscription);
        setBilling(data.billing);
      }
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runPlanChange = useCallback(
    async (payload) => {
      setActionLoading(true);
      try {
        const res = await fetchWithAuth("/api/billing/plan/change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res?.ok) {
          onToast?.(res?.userMessage || "요청에 실패했습니다.", "error");
          return;
        }
        if (res.action === "checkout" && res.planId) {
          if (!billing?.checkoutEnabled) {
            onToast?.(
              billing?.upgradeDisabledReason ||
                billing?.userMessage ||
                "지금은 결제를 이용할 수 없습니다.",
              "info"
            );
            return;
          }
          await startCheckout(res.planId, res.changeKind || "upgrade");
          await load();
          return;
        }
        onToast?.(res.userMessage || "반영되었습니다.", "success");
        setConfirm(null);
        await load();
        onUpgradePlans?.();
      } catch {
        onToast?.("플랜 변경에 실패했습니다.", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [billing, startCheckout, load, onToast, onUpgradePlans]
  );

  if (loading) {
    return (
      <p className="text-[10px] text-[#B0B8C1]">구독 정보 불러오는 중…</p>
    );
  }

  if (!sub) return null;

  if (sub.bypassBilling) {
    return (
      <div className="rounded-xl border border-[#03C75A]/25 bg-[#F0FFF5] px-3 py-2">
        <p className="text-[11px] font-semibold text-[#03A94D]">
          {sub.planLabel}
          {sub.betaPeriod ? "" : " (관리자)"}
        </p>
        {sub.betaPeriod && (
          <p className="mt-1 text-[10px] leading-snug text-[#4E5968]">
            베타 기간 동안 결제 없이 전 기능을 이용할 수 있습니다.
          </p>
        )}
      </div>
    );
  }

  const effective = normalizePlanId(sub.effectivePlanId);
  const stored = normalizePlanId(sub.planId);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-[#4E5968]">{sub.planLabel}</span>
        {effective !== "studio" && (
          <button
            type="button"
            onClick={() => onUpgradePlans?.()}
            className="shrink-0 text-[#03A94D] hover:underline"
          >
            플랜 변경
          </button>
        )}
      </div>
    );
  }

  const renewal = formatKoDate(sub.renewalDate);
  const pendingLabel = sub.pendingPlanLabel;
  const pendingAt = formatKoDate(sub.planEffectiveAt);

  const downgradeTargets = PLAN_ORDER.filter(
    (id) => getPlanRank(id) < getPlanRank(effective) && id !== "free"
  );

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-[#191F28]">
            {sub.planLabel} 플랜
          </p>
          {renewal && effective !== "free" && (
            <p className="mt-0.5 text-[10px] text-[#8B95A1]">
              다음 결제일 {renewal}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[#E8F9EF] px-2 py-0.5 text-[9px] font-bold text-[#03A94D]">
          {effective === "free" ? "무료" : "이용 중"}
        </span>
      </div>

      {(sub.pendingPlan || sub.cancelAtPeriodEnd) && pendingAt && (
        <p className="mt-2 rounded-lg bg-[#FFF8E6] px-2 py-1.5 text-[10px] leading-snug text-[#8A6D00]">
          {sub.cancelAtPeriodEnd && !sub.pendingPlan
            ? `${pendingAt}부터 무료 플랜으로 전환됩니다.`
            : `다음 결제일(${pendingAt})부터 ${pendingLabel || "변경"} 플랜이 적용됩니다. 현재 ${PLANS[stored]?.label || sub.planLabel} 혜택이 유지됩니다.`}
        </p>
      )}

      <p className="mt-2 text-[9px] leading-snug text-[#B0B8C1]">
        업그레이드는 결제 확인 후 즉시 적용됩니다. 다운그레이드·해지는 다음 결제일부터
        적용되며, 환불·일할 정산은{" "}
        <a href="/refund" className="text-[#03A94D] underline">
          환불정책
        </a>
        을 따릅니다.
      </p>

      <div className="mt-2 flex flex-col gap-1">
        {effective !== "studio" && !billing?.betaActive && (
          <button
            type="button"
            disabled={actionLoading || checkoutLoading}
            onClick={() => onUpgradePlans?.()}
            className="w-full rounded-lg bg-[#03C75A] py-2 text-[11px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-60"
          >
            {effective === "free" ? "플랜 업그레이드" : "스튜디오로 업그레이드"}
          </button>
        )}

        {downgradeTargets.map((id) => (
          <button
            key={id}
            type="button"
            disabled={actionLoading}
            onClick={() =>
              setConfirm({
                type: "downgrade",
                targetPlanId: id,
                message: `다음 결제일(${renewal || "갱신일"})부터 ${PLANS[id].label} 플랜으로 변경합니다. 그때까지 현재 플랜 혜택이 유지됩니다. 계속할까요?`,
              })
            }
            className="w-full rounded-lg border border-[#E8EBED] py-1.5 text-[10px] font-medium text-[#4E5968] hover:border-[#03C75A]/40"
          >
            {PLANS[id].label}로 다운그레이드 (다음 결제일부터)
          </button>
        ))}

        {effective !== "free" && !sub.cancelAtPeriodEnd && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              setConfirm({
                type: "cancel",
                message: `다음 결제일(${renewal || "갱신일"}) 이후 무료 플랜으로 전환됩니다. 그때까지 유료 기능을 이용할 수 있습니다. 해지 예약할까요?`,
              })
            }
            className="w-full py-1 text-[10px] text-[#8B95A1] hover:text-[#E65100]"
          >
            구독 해지 (기간 종료 후 무료)
          </button>
        )}

        {(sub.pendingPlan || sub.cancelAtPeriodEnd) && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => runPlanChange({ action: "revoke" })}
            className="w-full py-1 text-[10px] font-semibold text-[#03A94D] hover:underline"
          >
            예약된 변경·해지 취소
          </button>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-[14px] font-semibold text-[#191F28]">
              {confirm.type === "cancel" ? "구독 해지 예약" : "플랜 다운그레이드"}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#4E5968]">
              {confirm.message}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-[#E8EBED] py-2.5 text-[13px] font-medium text-[#4E5968]"
              >
                취소
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  runPlanChange(
                    confirm.type === "cancel"
                      ? { action: "cancel" }
                      : {
                          targetPlanId: confirm.targetPlanId,
                          timing: "next_cycle",
                        }
                  )
                }
                className="flex-1 rounded-xl bg-[#191F28] py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
