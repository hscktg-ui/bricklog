/**
 * SMS OTP — 재발송 시 이전 dev OTP 무효화
 */
import assert from "node:assert/strict";
import {
  devOtpInsert,
  devOtpInvalidateActive,
  devOtpLatestActive,
} from "../lib/sms/devOtpStore.js";
import { hashOtpCode, verifyOtpHash } from "../lib/sms/otpCrypto.js";

const phone = "01099998877";
const first = devOtpInsert({
  phone_normalized: phone,
  code_hash: hashOtpCode(phone, "111111"),
  expires_at: new Date(Date.now() + 300_000).toISOString(),
});
devOtpInsert({
  phone_normalized: phone,
  code_hash: hashOtpCode(phone, "222222"),
  expires_at: new Date(Date.now() + 300_000).toISOString(),
});

devOtpInvalidateActive(phone);
const active = devOtpLatestActive(phone);
assert.equal(active, null, "invalidate clears active rows");

devOtpInsert({
  phone_normalized: phone,
  code_hash: hashOtpCode(phone, "333333"),
  expires_at: new Date(Date.now() + 300_000).toISOString(),
});
const latest = devOtpLatestActive(phone);
assert.ok(latest, "new row active");
assert.ok(verifyOtpHash(phone, "333333", latest.code_hash), "new code matches");
assert.ok(!verifyOtpHash(phone, "222222", latest.code_hash), "old code rejected");

console.log("PASS: dev otp invalidate on resend");
