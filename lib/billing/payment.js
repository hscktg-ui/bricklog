import { getBillingPresentation } from "@/lib/billing/billingPresentation";
import {
  getTossSecretKey,
  isTossConfigured,
} from "@/lib/billing/toss/server";

/**
 * Payment gateway readiness (server-only). Never expose secret keys to the client.
 */
export function getPaymentIntegrationStatus(opts = {}) {
  const stripeSecret = !!process.env.STRIPE_SECRET_KEY?.trim();
  const stripePublic = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const stripeConfigured = stripeSecret && stripePublic;
  const ui = getBillingPresentation({
    forOperator: opts.forOperator === true,
  });

  return {
    live: (getTossSecretKey() || "").startsWith("live_"),
    gatewayReady: stripeConfigured || ui.tossConfigured,
    stripeConfigured,
    tossConfigured: ui.tossConfigured,
    tossBillingMode: ui.tossBillingMode,
    checkoutEnabled: ui.checkoutEnabled,
    betaActive: ui.betaActive,
    betaUntil: ui.betaUntil,
    betaUntilLabel: ui.betaUntilLabel,
    paymentStatus: ui.paymentStatus,
    paymentNote: ui.paymentNote,
    upgradeDisabledReason: ui.upgradeDisabledReason,
    operatorHint: ui.operatorHint,
    provider: ui.tossConfigured ? "toss" : stripeConfigured ? "stripe" : null,
    userMessage: ui.userMessage,
  };
}
