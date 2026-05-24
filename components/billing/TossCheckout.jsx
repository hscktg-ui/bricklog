"use client";

import { useCallback, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { fetchWithAuth } from "@/lib/api/clientAuth";

/**
 * @param {string} planId — brand | studio
 * @param {(msg: string, type?: string) => void} [onToast]
 */
export function useTossCheckout({ onToast } = {}) {
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(
    async (planId, changeKind = "subscribe") => {
      setLoading(true);
      try {
        const prep = await fetchWithAuth("/api/billing/toss/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, changeKind }),
        });

        if (!prep?.ok || !prep.checkout) {
          onToast?.(
            prep?.userMessage || "결제를 준비하지 못했습니다.",
            "error"
          );
          return;
        }

        const c = prep.checkout;
        const tossPayments = await loadTossPayments(c.clientKey);
        const payment = tossPayments.payment({ customerKey: c.customerKey });

        if (c.mode === "billing") {
          await payment.requestBillingAuth({
            method: "CARD",
            successUrl: c.successUrl,
            failUrl: c.failUrl,
            customerEmail: c.customerEmail,
            customerName: c.customerName,
          });
        } else {
          await payment.requestPayment({
            method: "CARD",
            amount: { currency: "KRW", value: c.amount },
            orderId: c.orderId,
            orderName: c.orderName,
            successUrl: c.successUrl,
            failUrl: c.failUrl,
            customerEmail: c.customerEmail,
            customerName: c.customerName,
          });
        }
      } catch (err) {
        if (err?.code === "USER_CANCEL" || err?.message?.includes("취소")) {
          onToast?.("결제가 취소되었습니다.");
        } else {
          console.error("[TossCheckout]", err);
          onToast?.("결제창을 열지 못했습니다. 다시 시도해 주세요.", "error");
        }
      } finally {
        setLoading(false);
      }
    },
    [onToast]
  );

  return { startCheckout, loading };
}
