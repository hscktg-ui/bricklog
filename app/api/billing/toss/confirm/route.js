import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  getPendingCheckout,
  completePendingCheckout,
} from "@/lib/billing/toss/pendingStore";
import { activateUserSubscription, saveBillingKey } from "@/lib/billing/toss/subscriptions";
import { getTossOrderName } from "@/lib/billing/toss/plans";
import { tossApi, isTossConfigured, buildCustomerKey } from "@/lib/billing/toss/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function confirmOneTimePayment(userId, { paymentKey, orderId, amount }) {
  const pending = await getPendingCheckout(orderId);
  if (!pending || pending.user_id !== userId) {
    throw Object.assign(new Error("주문 정보를 찾을 수 없습니다."), {
      code: "ORDER_NOT_FOUND",
    });
  }
  if (pending.status === "completed") {
    return { planId: pending.plan_id, alreadyCompleted: true };
  }
  if (Number(amount) !== Number(pending.amount)) {
    throw Object.assign(new Error("결제 금액이 일치하지 않습니다."), {
      code: "AMOUNT_MISMATCH",
    });
  }

  const payment = await tossApi("/v1/payments/confirm", {
    method: "POST",
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: pending.amount,
    }),
  });

  if (payment.status !== "DONE") {
    throw Object.assign(new Error("결제가 완료되지 않았습니다."), {
      code: "NOT_DONE",
    });
  }

  await activateUserSubscription(userId, pending.plan_id);
  await completePendingCheckout(orderId, { payment_key: paymentKey });
  return { planId: pending.plan_id, payment };
}

async function confirmBillingAuth(userId, { authKey, customerKey }) {
  const expectedCustomerKey = buildCustomerKey(userId);
  if (customerKey !== expectedCustomerKey) {
    throw Object.assign(new Error("고객 정보가 일치하지 않습니다."), {
      code: "CUSTOMER_MISMATCH",
    });
  }

  const issued = await tossApi("/v1/billing/authorizations/issue", {
    method: "POST",
    body: JSON.stringify({ authKey, customerKey }),
  });

  const billingKey = issued.billingKey;
  if (!billingKey) {
    throw Object.assign(new Error("빌링키 발급에 실패했습니다."), {
      code: "NO_BILLING_KEY",
    });
  }

  const pending = await getPendingCheckoutForUser(userId);
  if (!pending) {
    throw Object.assign(new Error("결제 준비 정보가 없습니다. 다시 시도해 주세요."), {
      code: "ORDER_NOT_FOUND",
    });
  }

  const orderName = getTossOrderName(pending.plan_id);
  const payment = await tossApi(
    `/v1/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      body: JSON.stringify({
        customerKey,
        amount: pending.amount,
        orderId: pending.order_id,
        orderName,
        customerEmail: undefined,
      }),
    }
  );

  if (payment.status !== "DONE") {
    throw Object.assign(new Error("첫 결제 승인에 실패했습니다."), {
      code: "NOT_DONE",
    });
  }

  const service = createServiceSupabase();
  if (service) {
    await saveBillingKey(service, {
      user_id: userId,
      customer_key: customerKey,
      billing_key: billingKey,
      card_company: issued.cardCompany || issued.card?.issuerCode || null,
      card_number_masked: issued.cardNumber || issued.card?.number || null,
      plan_id: pending.plan_id,
    });
  }

  await activateUserSubscription(userId, pending.plan_id);
  await completePendingCheckout(pending.order_id, {
    payment_key: payment.paymentKey,
    billing_key: billingKey,
  });

  return { planId: pending.plan_id, payment, billingKey };
}

async function getPendingCheckoutForUser(userId) {
  const service = createServiceSupabase();
  if (!service) return null;
  const { data } = await service
    .from("billing_checkouts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function POST(request) {
  if (!isTossConfigured()) {
    return NextResponse.json(
      { ok: false, userMessage: "토스페이먼츠가 설정되지 않았습니다." },
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

  try {
    let result;
    if (body.authKey && body.customerKey) {
      result = await confirmBillingAuth(auth.user.id, {
        authKey: String(body.authKey),
        customerKey: String(body.customerKey),
      });
    } else if (body.paymentKey && body.orderId) {
      result = await confirmOneTimePayment(auth.user.id, {
        paymentKey: String(body.paymentKey),
        orderId: String(body.orderId),
        amount: Number(body.amount),
      });
    } else {
      return NextResponse.json(
        { ok: false, userMessage: "결제 확인 정보가 부족합니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      planId: result.planId,
      alreadyCompleted: result.alreadyCompleted || false,
      userMessage: result.alreadyCompleted
        ? "이미 활성화된 구독입니다."
        : `${result.planId === "studio" ? "스튜디오" : "브랜드"} 플랜이 활성화되었습니다.`,
    });
  } catch (err) {
    const code = err.code;
    if (
      code === "ORDER_NOT_FOUND" ||
      code === "AMOUNT_MISMATCH" ||
      code === "CUSTOMER_MISMATCH"
    ) {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 400 }
      );
    }
    console.error("[toss/confirm]", err?.toss || err);
    return NextResponse.json(
      {
        ok: false,
        userMessage:
          err?.toss?.message || err.message || "결제 확인에 실패했습니다.",
        code: err?.toss?.code || err.code,
      },
      { status: err.status || 500 }
    );
  }
}
