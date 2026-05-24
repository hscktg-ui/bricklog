import {
  comparePlans,
  getPlanDefinition,
  isPaidPlan,
  normalizePlanId,
} from "@/lib/billing/plans";
import { ownerPlanOverride } from "@/lib/billing/adminEntitlement";
import {
  betaPlanOverride,
  getBetaFullAccessUntil,
} from "@/lib/billing/betaAccess";
import { createServiceSupabase } from "@/lib/supabase/server";

const SUBSCRIPTION_SELECT =
  "user_id, plan, status, pending_plan, plan_effective_at, cancel_at_period_end, current_period_start, current_period_end, payment_provider, last_payment_at, started_at, updated_at";

function isMissingColumn(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42703" ||
    (/pending_plan|plan_effective_at|current_period_end/i.test(msg) &&
      /column|does not exist/i.test(msg))
  );
}

/** @param {Date} [from] */
export function addOneMonth(from = new Date()) {
  const end = new Date(from);
  end.setMonth(end.getMonth() + 1);
  return end;
}

/**
 * Entitlement plan: paid plan until period end when downgrade/cancel is scheduled.
 * @param {object | null} row
 */
export function resolveEntitlementPlan(row) {
  if (!row || row.status !== "active") return "free";

  const now = Date.now();
  const periodEnd = row.current_period_end
    ? new Date(row.current_period_end).getTime()
    : null;

  if (row.cancel_at_period_end && periodEnd != null && now >= periodEnd) {
    return "free";
  }

  const pending = row.pending_plan ? normalizePlanId(row.pending_plan) : null;
  const effectiveAt = row.plan_effective_at
    ? new Date(row.plan_effective_at).getTime()
    : null;

  if (pending && effectiveAt != null && now >= effectiveAt) {
    return pending;
  }

  if (pending && effectiveAt != null && now < effectiveAt) {
    return normalizePlanId(row.plan);
  }

  return normalizePlanId(row.plan);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} userId
 */
export async function applyDuePlanChanges(service, userId) {
  const { data: row, error } = await service
    .from("user_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row) return row;
  if (isMissingColumn(error)) return row;

  const now = new Date();
  const periodEnd = row.current_period_end
    ? new Date(row.current_period_end)
    : null;
  const effectiveAt = row.plan_effective_at
    ? new Date(row.plan_effective_at)
    : null;

  const due =
    (periodEnd && now >= periodEnd) ||
    (effectiveAt && now >= effectiveAt);

  if (!due) return row;

  const patch = { updated_at: now.toISOString() };

  if (row.cancel_at_period_end && periodEnd && now >= periodEnd) {
    patch.plan = "free";
    patch.status = "active";
    patch.pending_plan = null;
    patch.plan_effective_at = null;
    patch.cancel_at_period_end = false;
    patch.current_period_start = null;
    patch.current_period_end = null;
  } else if (
    row.pending_plan &&
    effectiveAt &&
    now >= effectiveAt
  ) {
    patch.plan = normalizePlanId(row.pending_plan);
    patch.pending_plan = null;
    patch.plan_effective_at = null;
    patch.cancel_at_period_end = false;
    if (patch.plan === "free") {
      patch.current_period_start = null;
      patch.current_period_end = null;
    } else if (periodEnd && now >= periodEnd) {
      patch.current_period_start = periodEnd.toISOString();
      patch.current_period_end = addOneMonth(periodEnd).toISOString();
    }
  } else if (periodEnd && now >= periodEnd && !row.pending_plan && !row.cancel_at_period_end) {
    /* paid period lapsed without renewal — MVP keeps plan until manual payment */
    return row;
  } else {
    return row;
  }

  const { data: updated, error: upErr } = await service
    .from("user_subscriptions")
    .update(patch)
    .eq("user_id", userId)
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (upErr) throw upErr;
  return updated;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} userId
 */
export async function fetchSubscriptionRow(service, userId) {
  const { data, error } = await service
    .from("user_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingColumn(error)) {
      const { data: legacy, error: legErr } = await service
        .from("user_subscriptions")
        .select("user_id, plan, status, started_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (legErr) throw legErr;
      return legacy;
    }
    throw error;
  }

  if (!data) return null;

  try {
    return await applyDuePlanChanges(service, userId);
  } catch (e) {
    if (isMissingColumn(e)) return data;
    throw e;
  }
}

/**
 * @param {object | null} row
 * @param {string} [userEmail]
 */
export function formatSubscriptionState(row, userEmail = null) {
  const owner = ownerPlanOverride(userEmail);
  if (owner) {
    return {
      planId: owner.planId,
      effectivePlanId: owner.planId,
      status: "active",
      source: "admin_email",
      bypassBilling: true,
      betaPeriod: false,
      renewalDate: null,
      periodStart: null,
      periodEnd: null,
      pendingPlan: null,
      planEffectiveAt: null,
      cancelAtPeriodEnd: false,
      canManage: false,
      planLabel: getPlanDefinition(owner.planId).label,
      pendingPlanLabel: null,
    };
  }

  const beta = betaPlanOverride();
  if (beta) {
    const studio = getPlanDefinition("studio");
    return {
      planId: normalizePlanId(row?.plan || "free"),
      effectivePlanId: beta.planId,
      status: "active",
      source: beta.source,
      bypassBilling: true,
      betaPeriod: true,
      betaUntil: getBetaFullAccessUntil(),
      renewalDate: null,
      periodStart: null,
      periodEnd: null,
      pendingPlan: null,
      planEffectiveAt: null,
      cancelAtPeriodEnd: false,
      canManage: false,
      planLabel: `${studio.label} (베타)`,
      pendingPlanLabel: null,
    };
  }

  const effectivePlanId = resolveEntitlementPlan(row);
  const storedPlan = normalizePlanId(row?.plan || "free");
  const pendingPlan = row?.pending_plan
    ? normalizePlanId(row.pending_plan)
    : null;

  return {
    planId: storedPlan,
    effectivePlanId,
    status: row?.status || "active",
    source: row ? "subscription" : "default",
    bypassBilling: false,
    betaPeriod: false,
    betaUntil: null,
    renewalDate: row?.current_period_end || null,
    periodStart: row?.current_period_start || null,
    periodEnd: row?.current_period_end || null,
    pendingPlan,
    planEffectiveAt: row?.plan_effective_at || null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    lastPaymentAt: row?.last_payment_at || null,
    paymentProvider: row?.payment_provider || null,
    canManage: isPaidPlan(storedPlan) || isPaidPlan(effectivePlanId),
    planLabel: getPlanDefinition(effectivePlanId).label,
    pendingPlanLabel: pendingPlan
      ? getPlanDefinition(pendingPlan).label
      : null,
  };
}

/**
 * Activate or upgrade after successful payment.
 * @param {string} userId
 * @param {string} planId
 * @param {{ changeKind?: string }} [opts]
 */
export async function activatePaidSubscription(userId, planId, opts = {}) {
  const plan = normalizePlanId(planId);
  if (!isPaidPlan(plan)) {
    throw new Error("Invalid plan for subscription activation");
  }

  const service = createServiceSupabase();
  if (!service) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for billing");
  }

  const now = new Date();
  const periodEnd = addOneMonth(now);

  const { data: existing } = await service
    .from("user_subscriptions")
    .select("plan, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const patch = {
    user_id: userId,
    plan,
    status: "active",
    pending_plan: null,
    plan_effective_at: null,
    cancel_at_period_end: false,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    payment_provider: "toss",
    last_payment_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { error } = await service.from("user_subscriptions").upsert(patch, {
    onConflict: "user_id",
  });

  if (error) {
    if (isMissingColumn(error)) {
      const { error: legacyErr } = await service.from("user_subscriptions").upsert(
        {
          user_id: userId,
          plan,
          status: "active",
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (legacyErr) throw legacyErr;
      return { planId: plan, status: "active" };
    }
    throw error;
  }

  return { planId: plan, status: "active", periodEnd: periodEnd.toISOString() };
}

/**
 * @param {string} userId
 * @param {string} targetPlanId
 * @param {'immediate'|'next_cycle'} timing
 */
export async function requestPlanChange(userId, targetPlanId, timing = "next_cycle") {
  const service = createServiceSupabase();
  if (!service) {
    throw Object.assign(
      new Error("서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 필요합니다."),
      { code: "NO_SERVICE_ROLE" }
    );
  }

  const target = normalizePlanId(targetPlanId);
  const row = await fetchSubscriptionRow(service, userId);
  const current = resolveEntitlementPlan(row);
  const delta = comparePlans(current, target);

  if (delta === 0 && !row?.pending_plan && !row?.cancel_at_period_end) {
    return {
      action: "noop",
      userMessage: "이미 해당 플랜을 이용 중입니다.",
    };
  }

  if (delta > 0) {
    if (timing === "next_cycle") {
      const periodEnd =
        row?.current_period_end || addOneMonth(new Date()).toISOString();
      const { error } = await service.from("user_subscriptions").upsert(
        {
          user_id: userId,
          plan: normalizePlanId(row?.plan || current),
          status: "active",
          pending_plan: target,
          plan_effective_at: periodEnd,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      const label = getPlanDefinition(target).label;
      return {
        action: "scheduled",
        pendingPlan: target,
        planEffectiveAt: periodEnd,
        userMessage: `다음 결제일(${formatDateKo(periodEnd)})부터 ${label} 플랜이 적용됩니다.`,
      };
    }
    return {
      action: "checkout",
      planId: target,
      changeKind: current === "free" ? "subscribe" : "upgrade",
      userMessage: `${getPlanDefinition(target).label} 플랜으로 업그레이드하려면 결제를 진행해 주세요.`,
    };
  }

  if (delta < 0 || target === "free") {
    const periodEnd =
      row?.current_period_end || addOneMonth(new Date()).toISOString();
    const pending = target === "free" ? "free" : target;

    if (!isPaidPlan(current) && current === "free") {
      return {
        action: "noop",
        userMessage: "무료 플랜입니다.",
      };
    }

    const { error } = await service.from("user_subscriptions").upsert(
      {
        user_id: userId,
        plan: normalizePlanId(row?.plan || current),
        status: "active",
        pending_plan: pending,
        plan_effective_at: periodEnd,
        cancel_at_period_end: target === "free",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;

    const label =
      target === "free" ? "무료" : getPlanDefinition(target).label;
    return {
      action: "scheduled",
      pendingPlan: pending,
      planEffectiveAt: periodEnd,
      cancelAtPeriodEnd: target === "free",
      userMessage: `다음 결제일(${formatDateKo(periodEnd)})부터 ${label} 플랜으로 변경됩니다. 그때까지 현재 플랜 혜택이 유지됩니다.`,
    };
  }

  return { action: "noop", userMessage: "변경할 수 없습니다." };
}

/**
 * @param {string} userId
 */
export async function scheduleCancelAtPeriodEnd(userId) {
  return requestPlanChange(userId, "free", "next_cycle");
}

/**
 * @param {string} userId
 */
export async function revokeScheduledChanges(userId) {
  const service = createServiceSupabase();
  if (!service) {
    throw Object.assign(new Error("서버 설정이 필요합니다."), {
      code: "NO_SERVICE_ROLE",
    });
  }

  const { error } = await service
    .from("user_subscriptions")
    .update({
      pending_plan: null,
      plan_effective_at: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
  return {
    action: "revoked",
    userMessage: "예약된 플랜 변경·해지가 취소되었습니다.",
  };
}

function formatDateKo(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
