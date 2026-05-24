import { activatePaidSubscription } from "@/lib/billing/subscriptionService";
import { normalizePlanId } from "@/lib/billing/plans";
import { createServiceSupabase } from "@/lib/supabase/server";

/**
 * Activate paid plan after verified Toss payment (service role).
 * Sets billing period (current_period_start/end). Renewal via billing key or manual payment (MVP).
 *
 * Toss billing modes:
 * - payment: one-time charge per checkout (first month); renewals need new checkout until cron/billing API
 * - billing: card on file via toss_billing_keys; charge POST /v1/billing/{billingKey} each period (cron not in MVP)
 *
 * @param {string} userId
 * @param {string} planId
 */
export async function activateUserSubscription(userId, planId) {
  const plan = normalizePlanId(planId);
  if (plan !== "brand" && plan !== "studio") {
    throw new Error("Invalid plan for subscription activation");
  }
  return activatePaidSubscription(userId, plan);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {object} row
 */
export async function saveBillingKey(service, row) {
  const { error } = await service.from("toss_billing_keys").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw error;
}
