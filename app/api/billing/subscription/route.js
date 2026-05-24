import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  fetchSubscriptionRow,
  formatSubscriptionState,
} from "@/lib/billing/subscriptionService";
import { getPaymentIntegrationStatus } from "@/lib/billing/payment";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const service = createServiceSupabase();
  let row = null;
  if (service) {
    try {
      row = await fetchSubscriptionRow(service, auth.user.id);
    } catch (err) {
      console.error("[billing/subscription]", err);
    }
  }

  const subscription = formatSubscriptionState(row, auth.user.email);
  const billing = getPaymentIntegrationStatus();

  return NextResponse.json({
    ok: true,
    subscription,
    billing: {
      checkoutEnabled: billing.checkoutEnabled,
      tossBillingMode: billing.tossBillingMode,
      userMessage: billing.userMessage,
      paymentNote: billing.paymentNote,
      paymentStatus: billing.paymentStatus,
      betaActive: billing.betaActive,
      betaUntilLabel: billing.betaUntilLabel,
      upgradeDisabledReason: billing.upgradeDisabledReason,
    },
  });
}
