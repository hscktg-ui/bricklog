import { NextResponse } from "next/server";
import {
  fetchTossPayment,
  verifyTossWebhookSignature,
  isTossConfigured,
} from "@/lib/billing/toss/server";
import {
  getPendingCheckout,
  completePendingCheckout,
} from "@/lib/billing/toss/pendingStore";
import { activateUserSubscription } from "@/lib/billing/toss/subscriptions";

export const runtime = "nodejs";

async function handlePaymentDone(orderId, paymentKey) {
  const pending = await getPendingCheckout(orderId);
  if (!pending || pending.status === "completed") return;

  const payment = await fetchTossPayment(paymentKey);
  if (payment.status !== "DONE") return;
  if (Number(payment.totalAmount) !== Number(pending.amount)) {
    console.warn("[toss/webhook] amount mismatch", orderId);
    return;
  }

  await activateUserSubscription(pending.user_id, pending.plan_id);
  await completePendingCheckout(orderId, {
    payment_key: paymentKey,
    change_kind: pending.change_kind || "subscribe",
  });
}

export async function POST(request) {
  if (!isTossConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("tosspayments-webhook-signature");

  const webhookSecret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !webhookSecret) {
    console.error("[toss/webhook] TOSS_PAYMENTS_WEBHOOK_SECRET required in production");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (webhookSecret) {
    if (!verifyTossWebhookSignature(signature, rawBody)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const eventType = event?.eventType || event?.type;
    const data = event?.data || event;

    if (eventType === "PAYMENT_STATUS_CHANGED" && data?.paymentKey) {
      const payment = await fetchTossPayment(data.paymentKey);
      if (payment.status === "DONE" && payment.orderId?.startsWith("briclog-")) {
        await handlePaymentDone(payment.orderId, data.paymentKey);
      }
    }
  } catch (err) {
    console.error("[toss/webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
