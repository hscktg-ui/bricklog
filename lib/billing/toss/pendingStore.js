import {
  getTossBillingMode,
  buildOrderId,
} from "@/lib/billing/toss/server";
import { getTossPlanAmount } from "@/lib/billing/toss/plans";
import { createServiceSupabase } from "@/lib/supabase/server";

function isMissingCheckoutTable(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42P01" ||
    (/billing_checkouts/i.test(msg) && /does not exist|relation/i.test(msg))
  );
}

/**
 * @param {string} userId
 * @param {string} planId
 */
/**
 * @param {string} userId
 * @param {string} planId
 * @param {{ changeKind?: 'subscribe'|'upgrade'|'renewal' }} [opts]
 */
export async function createPendingCheckout(userId, planId, opts = {}) {
  const amount = getTossPlanAmount(planId);
  if (amount == null) {
    throw Object.assign(new Error("유료 플랜만 결제할 수 있습니다."), {
      code: "INVALID_PLAN",
    });
  }

  const service = createServiceSupabase();
  if (!service) {
    throw Object.assign(
      new Error("결제 준비를 위해 서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 필요합니다."),
      { code: "NO_SERVICE_ROLE" }
    );
  }

  const orderId = buildOrderId(userId);
  const mode = getTossBillingMode();

  const changeKind = opts.changeKind || "subscribe";

  const insertRow = {
    user_id: userId,
    order_id: orderId,
    plan_id: planId,
    amount,
    mode,
    status: "pending",
    change_kind: changeKind,
  };

  const { data, error } = await service
    .from("billing_checkouts")
    .insert(insertRow)
    .select("order_id, plan_id, amount, mode")
    .single();

  if (error) {
    if (
      error?.code === "42703" ||
      /change_kind/i.test(String(error?.message || ""))
    ) {
      const { data: retry, error: retryErr } = await service
        .from("billing_checkouts")
        .insert({
          user_id: userId,
          order_id: orderId,
          plan_id: planId,
          amount,
          mode,
          status: "pending",
        })
        .select("order_id, plan_id, amount, mode")
        .single();
      if (retryErr) throw retryErr;
      return retry;
    }
    if (isMissingCheckoutTable(error)) {
      throw Object.assign(
        new Error(
          "결제 테이블이 없습니다. Supabase에서 schema-v5c-toss-billing.sql을 실행해 주세요."
        ),
        { code: "MISSING_TABLE" }
      );
    }
    throw error;
  }

  return data;
}

/**
 * @param {string} orderId
 */
export async function getPendingCheckout(orderId) {
  const service = createServiceSupabase();
  if (!service) return null;

  const { data, error } = await service
    .from("billing_checkouts")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error && !isMissingCheckoutTable(error)) throw error;
  return data;
}

/**
 * @param {string} orderId
 * @param {object} patch
 */
export async function completePendingCheckout(orderId, patch = {}) {
  const service = createServiceSupabase();
  if (!service) return;

  await service
    .from("billing_checkouts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...patch,
    })
    .eq("order_id", orderId);
}
