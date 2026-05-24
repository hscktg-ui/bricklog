import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFICATION_TTL_MS = 30 * 60 * 1000;

export function otpTtlMs() {
  return OTP_TTL_MS;
}

export function verificationTtlMs() {
  return VERIFICATION_TTL_MS;
}

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

function pepper() {
  return (
    process.env.BRICLOG_SMS_OTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "briclog-sms-dev-pepper"
  );
}

export function hashOtpCode(phoneNormalized, code) {
  return createHash("sha256")
    .update(`${pepper()}:${phoneNormalized}:${code}`)
    .digest("hex");
}

export function verifyOtpHash(phoneNormalized, code, hash) {
  return hashOtpCode(phoneNormalized, code) === hash;
}
