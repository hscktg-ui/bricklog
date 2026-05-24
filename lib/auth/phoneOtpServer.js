import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";
import {
  generateOtpCode,
  hashOtpCode,
  otpTtlMs,
  verificationTtlMs,
  verifyOtpHash,
} from "@/lib/sms/otpCrypto";
import { sendSms } from "@/lib/sms/sendSms";
import { getSmsReadiness, useInMemoryOtpStore } from "@/lib/sms/smsReadiness";
import {
  devOtpCountRecent,
  devOtpGetById,
  devOtpInsert,
  devOtpLatestActive,
  devOtpUpdate,
} from "@/lib/sms/devOtpStore";

function serviceClient() {
  return createServiceSupabase();
}

function useDevOtpStore() {
  return useInMemoryOtpStore();
}

export function normalizePhoneInput(raw) {
  return normalizeKoreanMobile(raw);
}

/** @param {string} phoneNormalized */
async function countRecentSends(phoneNormalized) {
  if (useDevOtpStore()) {
    return devOtpCountRecent(phoneNormalized, 60 * 60 * 1000);
  }
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await serviceClient()
    .from("phone_otp_verifications")
    .select("id", { count: "exact", head: true })
    .eq("phone_normalized", phoneNormalized)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

async function insertOtpRow(norm, code) {
  const expiresAt = new Date(Date.now() + otpTtlMs()).toISOString();
  const codeHash = hashOtpCode(norm.e164, code);

  if (useDevOtpStore()) {
    return devOtpInsert({
      phone_normalized: norm.e164,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
  }

  const client = serviceClient();
  if (!client) {
    const err = new Error("SMS service unavailable");
    err.code = "SMS_SERVICE";
    throw err;
  }

  const { error } = await client.from("phone_otp_verifications").insert({
    phone_normalized: norm.e164,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return { id: null, expires_at: expiresAt };
}

async function loadLatestOtpRow(phoneNormalized) {
  if (useDevOtpStore()) {
    return devOtpLatestActive(phoneNormalized);
  }
  const { data: row, error } = await serviceClient()
    .from("phone_otp_verifications")
    .select("id, code_hash, expires_at, verified_at, verify_attempts, consumed_at")
    .eq("phone_normalized", phoneNormalized)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return row;
}

async function bumpVerifyAttempts(row) {
  const next = (row.verify_attempts ?? 0) + 1;
  if (useDevOtpStore()) {
    devOtpUpdate(row.id, { verify_attempts: next });
    return;
  }
  await serviceClient()
    .from("phone_otp_verifications")
    .update({ verify_attempts: next })
    .eq("id", row.id);
}

async function markVerified(row) {
  const verifiedAt = new Date().toISOString();
  if (useDevOtpStore()) {
    devOtpUpdate(row.id, { verified_at: verifiedAt });
    return verifiedAt;
  }
  const { error: upErr } = await serviceClient()
    .from("phone_otp_verifications")
    .update({ verified_at: verifiedAt })
    .eq("id", row.id);
  if (upErr) throw upErr;
  return verifiedAt;
}

/**
 * @param {string} phoneRaw
 * @returns {Promise<{ ok: true, expiresInSec: number, devHint?: string } | { ok: false, message: string, code?: string }>}
 */
export async function sendPhoneOtp(phoneRaw) {
  const readiness = getSmsReadiness();
  if (!readiness.ready) {
    return {
      ok: false,
      code: readiness.code,
      message: readiness.message,
    };
  }

  const norm = normalizePhoneInput(phoneRaw);
  if (!norm.ok) return { ok: false, message: norm.message };

  const sends = await countRecentSends(norm.e164);
  if (sends >= 5) {
    return {
      ok: false,
      message: "인증번호 요청이 너무 많습니다. 1시간 뒤 다시 시도해 주세요.",
    };
  }

  const code = generateOtpCode();
  try {
    await insertOtpRow(norm, code);
  } catch (err) {
    if (isMissingPhoneOtpTable(err)) {
      return {
        ok: false,
        code: "SMS_DB",
        message:
          "문자 인증 DB가 없습니다. Supabase SQL Editor에서 schema-v14-phone-sms.sql을 실행해 주세요.",
      };
    }
    if (err?.code === "SMS_SERVICE") {
      return {
        ok: false,
        code: "SMS_SERVICE",
        message:
          "인증 서버 키(SUPABASE_SERVICE_ROLE_KEY)가 없습니다. .env.local에 추가 후 서버를 재시작해 주세요.",
      };
    }
    throw err;
  }

  const sms = await sendSms({
    toE164: norm.e164,
    message: `[브릭로그] 인증번호 ${code}`,
  });
  if (!sms.ok) {
    return {
      ok: false,
      message: sms.message,
      code: sms.providerCode ? "SMS_PROVIDER" : undefined,
    };
  }

  const devHint =
    process.env.BRICLOG_SMS_DEV_MODE === "true"
      ? `개발 모드 인증번호: ${sms.devCode || code}`
      : undefined;

  return {
    ok: true,
    expiresInSec: Math.floor(otpTtlMs() / 1000),
    devHint,
  };
}

/**
 * @param {string} phoneRaw
 * @param {string} code
 */
export async function verifyPhoneOtp(phoneRaw, code) {
  const norm = normalizePhoneInput(phoneRaw);
  if (!norm.ok) return { ok: false, message: norm.message };

  const digits = String(code || "").replace(/\D/g, "");
  if (digits.length !== 6) {
    return { ok: false, message: "인증번호 6자리를 입력해 주세요." };
  }

  const row = await loadLatestOtpRow(norm.e164);
  if (!row) {
    return { ok: false, message: "인증번호를 먼저 요청해 주세요." };
  }
  if (row.consumed_at) {
    return { ok: false, message: "이미 사용된 인증입니다. 다시 요청해 주세요." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "인증번호가 만료되었습니다. 다시 요청해 주세요." };
  }
  if ((row.verify_attempts ?? 0) >= 8) {
    return { ok: false, message: "시도 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요." };
  }

  const match = verifyOtpHash(norm.e164, digits, row.code_hash);
  await bumpVerifyAttempts(row);

  if (!match) {
    return { ok: false, message: "인증번호가 일치하지 않습니다." };
  }

  await markVerified(row);

  return {
    ok: true,
    verificationId: row.id,
    phone: norm.display,
    phoneNormalized: norm.e164,
    validUntil: new Date(Date.now() + verificationTtlMs()).toISOString(),
  };
}

/**
 * @param {string} verificationId
 * @param {string} phoneRaw
 */
export async function assertPhoneVerificationConsumable(verificationId, phoneRaw) {
  const norm = normalizePhoneInput(phoneRaw);
  if (!norm.ok) return { ok: false, message: norm.message };

  let row;
  if (useDevOtpStore() && String(verificationId).startsWith("dev-")) {
    row = devOtpGetById(verificationId);
  } else {
    const client = serviceClient();
    if (!client) {
      return { ok: false, message: "인증 서버를 사용할 수 없습니다." };
    }
    const { data, error } = await client
      .from("phone_otp_verifications")
      .select("id, phone_normalized, verified_at, consumed_at")
      .eq("id", verificationId)
      .maybeSingle();
    if (error) throw error;
    row = data;
  }

  if (!row?.verified_at) {
    return { ok: false, message: "휴대폰 인증을 완료해 주세요." };
  }
  if (row.consumed_at) {
    return { ok: false, message: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." };
  }
  if (row.phone_normalized !== norm.e164) {
    return { ok: false, message: "인증한 번호와 입력한 번호가 다릅니다." };
  }
  const verifiedMs = new Date(row.verified_at).getTime();
  if (verifiedMs + verificationTtlMs() < Date.now()) {
    return { ok: false, message: "휴대폰 인증 시간이 지났습니다. 다시 인증해 주세요." };
  }

  return { ok: true, phoneDisplay: norm.display, phoneNormalized: norm.e164 };
}

export async function consumePhoneVerification(verificationId) {
  if (useDevOtpStore() && String(verificationId).startsWith("dev-")) {
    devOtpUpdate(verificationId, { consumed_at: new Date().toISOString() });
    return;
  }
  const client = serviceClient();
  if (!client) return;
  await client
    .from("phone_otp_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", verificationId);
}

export function isMissingPhoneOtpTable(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42P01" ||
    (/phone_otp_verifications/i.test(msg) && /does not exist|relation/i.test(msg))
  );
}
