import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { TOSS_PAID_PLAN_IDS } from "@/lib/billing/toss/plans";
import { getTossOrderName } from "@/lib/billing/toss/plans";
import { createPendingCheckout } from "@/lib/billing/toss/pendingStore";
import {
  isTossConfigured,
  buildAppUrl,
  buildCustomerKey,
  getTossClientKey,
} from "@/lib/billing/toss/server";
import { isBriclogResetPaymentPaused } from "@/lib/config/resetLaunchFlags";
import {
  assertDevFreezeAllowed,
  DEV_FREEZE_FEATURES,
} from "@/lib/config/devFreeze";

export const runtime = "nodejs";

export async function POST(request) {
  const frozen = assertDevFreezeAllowed(DEV_FREEZE_FEATURES.pricing);
  if (!frozen.ok || isBriclogResetPaymentPaused()) {
    return NextResponse.json(
      {
        ok: false,
        userMessage:
          frozen.userMessage ||
          "품질 안정화 기간에는 결제를 받지 않습니다.",
        code: "payment_paused",
      },
      { status: 503 }
    );
  }

  if (!isTossConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        userMessage:
          "토스페이먼츠가 설정되지 않았습니다. 운영자에게 TOSS_PAYMENTS_* 키 설정을 요청하세요.",
      },
      { status: 503 }
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
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

  const planId = String(body?.planId || "").trim();
  const changeKind =
    body?.changeKind === "upgrade" || body?.changeKind === "renewal"
      ? body.changeKind
      : "subscribe";

  if (!TOSS_PAID_PLAN_IDS.includes(planId)) {
    return NextResponse.json(
      { ok: false, userMessage: "브랜드 또는 스튜디오 플랜만 결제할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const pending = await createPendingCheckout(auth.user.id, planId, {
      changeKind,
    });
    const customerKey = buildCustomerKey(auth.user.id);

    return NextResponse.json({
      ok: true,
      checkout: {
        clientKey: getTossClientKey(),
        customerKey,
        orderId: pending.order_id,
        orderName: getTossOrderName(planId),
        amount: pending.amount,
        planId: pending.plan_id,
        mode: pending.mode,
        successUrl: buildAppUrl("/billing/toss/success"),
        failUrl: buildAppUrl("/billing/toss/fail"),
        customerEmail: auth.user.email || undefined,
        customerName:
          auth.user.user_metadata?.full_name ||
          auth.user.user_metadata?.name ||
          undefined,
      },
    });
  } catch (err) {
    if (err.code === "INVALID_PLAN") {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 400 }
      );
    }
    if (err.code === "MISSING_TABLE" || err.code === "NO_SERVICE_ROLE") {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 503 }
      );
    }
    console.error("[toss/prepare]", err);
    return NextResponse.json(
      { ok: false, userMessage: "결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
