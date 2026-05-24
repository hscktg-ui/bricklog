import crypto from "crypto";

const TOSS_API_BASE = "https://api.tosspayments.com";

export function getTossSecretKey() {
  return (
    process.env.TOSS_PAYMENTS_SECRET_KEY?.trim() ||
    process.env.TOSS_SECRET_KEY?.trim() ||
    ""
  );
}

export function getTossClientKey() {
  return (
    process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim() ||
    process.env.TOSS_CLIENT_KEY?.trim() ||
    ""
  );
}

export function isTossConfigured() {
  return Boolean(getTossSecretKey() && getTossClientKey());
}

export function getTossBillingMode() {
  const mode = (process.env.TOSS_BILLING_MODE || "payment").trim().toLowerCase();
  return mode === "billing" ? "billing" : "payment";
}

export function tossAuthHeader() {
  const secret = getTossSecretKey();
  const encoded = Buffer.from(`${secret}:`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

/**
 * @param {string} path e.g. /v1/payments/confirm
 * @param {RequestInit} init
 */
export async function tossApi(path, init = {}) {
  const url = `${TOSS_API_BASE}${path}`;
  const headers = {
    Authorization: tossAuthHeader(),
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Toss API ${res.status}`);
    err.code = data?.code;
    err.status = res.status;
    err.toss = data;
    throw err;
  }
  return data;
}

export function buildAppUrl(path) {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildCustomerKey(userId) {
  return `briclog_${String(userId).replace(/-/g, "")}`;
}

export function buildOrderId(userId) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const short = String(userId).replace(/-/g, "").slice(0, 12);
  return `briclog-${short}-${stamp}-${rand}`;
}

/**
 * General payment webhooks have no signature — re-query payment by key.
 * @param {string} paymentKey
 */
export async function fetchTossPayment(paymentKey) {
  return tossApi(`/v1/payments/${encodeURIComponent(paymentKey)}`, {
    method: "GET",
  });
}

/**
 * @param {string} signatureHeader
 * @param {string} rawBody
 */
export function verifyTossWebhookSignature(signatureHeader, rawBody) {
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
