import { getPlanDefinition, resolveEffectivePlan } from "./plans";
import { computeUsageWarning } from "./planUx";
import { ownerPlanOverride } from "./adminEntitlement";
import { betaPlanOverride } from "./betaAccess";
import {
  resolveEntitlementPlan,
  applyDuePlanChanges,
} from "./subscriptionService";
import { createServiceSupabase } from "@/lib/supabase/server";

export function currentPeriodYyyymm(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isMissingBillingTable(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42P01" ||
    (/user_subscriptions|usage_monthly/i.test(msg) &&
      /does not exist|relation/i.test(msg))
  );
}

export async function fetchUserPlan(supabase, userId, userEmail = null) {
  const owner = ownerPlanOverride(userEmail);
  if (owner) {
    return { ...owner, billingReady: true };
  }

  const beta = betaPlanOverride();
  if (beta) {
    return { ...beta, billingReady: true };
  }

  if (process.env.BRICLOG_DEV_PRO === "true") {
    return { planId: "studio", source: "dev_env", bypassQuotas: false };
  }

  let row = null;
  const service = createServiceSupabase();
  if (service) {
    try {
      row = await applyDuePlanChanges(service, userId);
    } catch (e) {
      console.error("[usageLedger] applyDue", e);
    }
  }

  if (!row) {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(
        "plan, status, pending_plan, plan_effective_at, cancel_at_period_end, current_period_end"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingBillingTable(error)) {
        return { planId: "free", source: "default", billingReady: false };
      }
      console.error("[usageLedger] subscription", error);
      return { planId: "free", source: "default", billingReady: true };
    }
    row = data;
  }

  const planId =
    row && row.status === "active"
      ? resolveEntitlementPlan(row)
      : resolveEffectivePlan("free");
  return { planId, source: row ? "subscription" : "default", billingReady: true };
}

export async function getOrCreateMonthlyUsage(supabase, userId, period) {
  const period_yyyymm = period || currentPeriodYyyymm();

  const { data: existing, error: selErr } = await supabase
    .from("usage_monthly")
    .select("id, content_count, image_count")
    .eq("user_id", userId)
    .eq("period_yyyymm", period_yyyymm)
    .maybeSingle();

  if (selErr && !isMissingBillingTable(selErr)) {
    console.error("[usageLedger] select", selErr);
  }

  if (existing) {
    return {
      period_yyyymm,
      content_count: existing.content_count ?? 0,
      image_count: existing.image_count ?? 0,
      billingReady: !isMissingBillingTable(selErr),
    };
  }

  if (selErr && isMissingBillingTable(selErr)) {
    return {
      period_yyyymm,
      content_count: 0,
      image_count: 0,
      billingReady: false,
    };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("usage_monthly")
    .insert({
      user_id: userId,
      period_yyyymm,
      content_count: 0,
      image_count: 0,
    })
    .select("content_count, image_count")
    .single();

  if (insErr) {
    if (isMissingBillingTable(insErr)) {
      return {
        period_yyyymm,
        content_count: 0,
        image_count: 0,
        billingReady: false,
      };
    }
    console.error("[usageLedger] insert", insErr);
    return {
      period_yyyymm,
      content_count: 0,
      image_count: 0,
      billingReady: true,
    };
  }

  return {
    period_yyyymm,
    content_count: inserted?.content_count ?? 0,
    image_count: inserted?.image_count ?? 0,
    billingReady: true,
  };
}

function usageWarning(used, limit) {
  if (limit == null || limit <= 0) return false;
  return used / limit >= WARNING_RATIO;
}

export async function getUsageSummary(supabase, userId, userEmail = null) {
  const { planId, source, billingReady, bypassQuotas } = await fetchUserPlan(
    supabase,
    userId,
    userEmail
  );
  const plan = getPlanDefinition(planId);
  const monthly = await getOrCreateMonthlyUsage(supabase, userId);

  const contentUsed = monthly.content_count;
  const contentLimit = bypassQuotas ? null : plan.contentPerMonth;
  const imageUsed = monthly.image_count;
  const imageLimit = bypassQuotas ? null : plan.imagesPerMonth;

  return {
    planId,
    planLabel: plan.label,
    displayPrice: plan.displayPrice,
    source,
    billingReady,
    period: monthly.period_yyyymm,
    content: {
      used: contentUsed,
      limit: contentLimit,
      remaining:
        contentLimit == null
          ? null
          : Math.max(0, contentLimit - contentUsed),
    },
    image: {
      used: imageUsed,
      limit: imageLimit,
      remaining:
        imageLimit == null ? null : Math.max(0, imageLimit - imageUsed),
    },
    bypassQuotas: Boolean(bypassQuotas),
    usageWarning: bypassQuotas
      ? false
      : computeUsageWarning(
          planId,
          { used: contentUsed, limit: contentLimit },
          { used: imageUsed, limit: imageLimit }
        ),
    entitlements: {
      brandToneMemory: true,
      brandAssetUploads: plan.brandAssetUploads ?? plan.brandMemory,
      brandMemory: plan.brandAssetUploads ?? plan.brandMemory,
      imageGeneration: plan.imageGeneration,
      sensitiveAudit: plan.sensitiveAudit,
      advancedAudit: plan.advancedAudit,
      topicRecommendations: plan.topicRecommendations,
      historyDays: plan.historyDays,
      maxBrands: plan.brands,
      pipelineChannels: plan.pipelineChannels,
    },
  };
}

/** @param {'blog_generate'|'draft_review_improve'} [action] */
export async function incrementContentUsage(
  supabase,
  userId,
  action = "blog_generate"
) {
  const period_yyyymm = currentPeriodYyyymm();
  const row = await getOrCreateMonthlyUsage(supabase, userId, period_yyyymm);
  const logAction =
    action === "draft_review_improve" ? "draft_review_improve" : "blog_generate";
  if (!row.billingReady) {
    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: logAction,
      meta: { billingFallback: true },
    });
    return row;
  }

  const next = (row.content_count ?? 0) + 1;
  await supabase
    .from("usage_monthly")
    .update({ content_count: next })
    .eq("user_id", userId)
    .eq("period_yyyymm", period_yyyymm);

  await supabase.from("usage_logs").insert({
    user_id: userId,
    action: logAction,
    meta: { period_yyyymm },
  });

  return { ...row, content_count: next };
}

export async function incrementImageUsage(supabase, userId) {
  const period_yyyymm = currentPeriodYyyymm();
  const row = await getOrCreateMonthlyUsage(supabase, userId, period_yyyymm);
  if (!row.billingReady) {
    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: "image_generate",
      meta: { billingFallback: true },
    });
    return row;
  }

  const next = (row.image_count ?? 0) + 1;
  await supabase
    .from("usage_monthly")
    .update({ image_count: next })
    .eq("user_id", userId)
    .eq("period_yyyymm", period_yyyymm);

  await supabase.from("usage_logs").insert({
    user_id: userId,
    action: "image_generate",
    meta: { period_yyyymm },
  });

  return { ...row, image_count: next };
}

export async function countImagesToday(supabase, userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "image_generate")
    .gte("created_at", start.toISOString());

  if (error) return 0;
  return count ?? 0;
}
