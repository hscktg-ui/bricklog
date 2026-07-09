import { NextResponse } from "next/server";
import { getPaymentIntegrationStatus } from "@/lib/billing/payment";
import { getTossClientKey } from "@/lib/billing/toss/server";

export const runtime = "nodejs";

/** Public billing UI config (no secrets). */
export async function GET() {
  const status = getPaymentIntegrationStatus({
    forOperator: process.env.NODE_ENV === "development",
  });
  return NextResponse.json({
    ok: true,
    billing: {
      checkoutEnabled: status.checkoutEnabled,
      tossConfigured: status.tossConfigured,
      tossBillingMode: status.tossBillingMode,
      provider: status.provider,
      providerId: status.providerId,
      providerLabel: status.providerLabel,
      inicisReview: status.inicisReview,
      clientKey:
        status.checkoutEnabled && status.providerId === "toss"
          ? getTossClientKey()
          : null,
      userMessage: status.userMessage,
      paymentNote: status.paymentNote,
      paymentStatus: status.paymentStatus,
      betaActive: status.betaActive,
      freeLaunchActive: status.freeLaunchActive,
      betaUntil: status.betaUntil,
      betaUntilLabel: status.betaUntilLabel,
      upgradeDisabledReason: status.upgradeDisabledReason,
      operatorHint: status.operatorHint,
    },
  });
}
