/**
 * 온보딩·가입 허들 — 휴대폰 선택·프로필 건너뛰기 회귀
 */
import assert from "node:assert/strict";
import { isSignupPhoneOptional } from "../lib/config/productFlags.js";
import {
  profileNeedsSetup,
  profileNeedsSetupModal,
} from "../lib/auth/profilePersonalization.js";

const prevPhone = process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;

delete process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
assert.equal(isSignupPhoneOptional(), true, "phone optional by default");

process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "false";
assert.equal(isSignupPhoneOptional(), false, "phone required when env false");

process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "true";
assert.equal(isSignupPhoneOptional(), true, "phone optional when env true");

const skippedProfile = {
  id: "u1",
  profileSetupSkippedAt: new Date().toISOString(),
};

assert.equal(
  profileNeedsSetup(skippedProfile),
  false,
  "banner hidden during skip cooldown"
);
assert.equal(
  profileNeedsSetupModal(skippedProfile, { userId: "u1" }),
  false,
  "modal hidden during skip cooldown"
);

const incompleteProfile = { id: "u2" };
assert.equal(profileNeedsSetup(incompleteProfile), true);
assert.equal(
  profileNeedsSetupModal(incompleteProfile, { userId: "u2" }),
  true
);

if (prevPhone === undefined) delete process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
else process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = prevPhone;

console.log("OK: onboarding-friction");
