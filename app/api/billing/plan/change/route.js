import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { PLAN_ORDER, normalizePlanId } from "@/lib/billing/plans";
import {
  requestPlanChange,
  scheduleCancelAtPeriodEnd,
  revokeScheduledChanges,
} from "@/lib/billing/subscriptionService";
import { hasOwnerFullAccess } from "@/lib/billing/adminEntitlement";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  if (hasOwnerFullAccess(auth.user.email)) {
    return NextResponse.json({
      ok: true,
      action: "admin_bypass",
      userMessage: "관리자 계정은 플랜 변경 없이 전체 기능을 이용합니다.",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const action = String(body?.action || "").trim();

  try {
    if (action === "cancel") {
      const result = await scheduleCancelAtPeriodEnd(auth.user.id);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "revoke") {
      const result = await revokeScheduledChanges(auth.user.id);
      return NextResponse.json({ ok: true, ...result });
    }

    const targetPlanId = normalizePlanId(String(body?.targetPlanId || "").trim());
    if (!PLAN_ORDER.includes(targetPlanId)) {
      return NextResponse.json(
        { ok: false, userMessage: "유효한 플랜을 선택해 주세요." },
        { status: 400 }
      );
    }

    const timing =
      body?.timing === "immediate" ? "immediate" : "next_cycle";

    const result = await requestPlanChange(
      auth.user.id,
      targetPlanId,
      timing
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err.code === "NO_SERVICE_ROLE") {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 503 }
      );
    }
    console.error("[billing/plan/change]", err);
    return NextResponse.json(
      {
        ok: false,
        userMessage: "플랜 변경 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
