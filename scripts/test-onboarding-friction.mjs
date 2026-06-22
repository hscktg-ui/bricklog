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
const prevLaunch = process.env.NEXT_PUBLIC_BRICLOG_LAUNCH;
const prevVercelEnv = process.env.VERCEL_ENV;
const prevNodeEnv = process.env.NODE_ENV;

delete process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
delete process.env.VERCEL_ENV;
process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = "false";
process.env.NODE_ENV = "development";
assert.equal(isSignupPhoneOptional(), true, "local dev keeps phone optional");

process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = "true";
assert.equal(isSignupPhoneOptional(), false, "launch build requires phone by default");

process.env.VERCEL_ENV = "production";
assert.equal(
  isSignupPhoneOptional(),
  false,
  "vercel production requires phone even with stale optional env"
);
process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "true";
assert.equal(
  isSignupPhoneOptional(),
  false,
  "vercel production ignores optional=true"
);

delete process.env.VERCEL_ENV;
process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "true";
assert.equal(isSignupPhoneOptional(), true, "explicit true on non-prod");

process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "false";
assert.equal(isSignupPhoneOptional(), false, "explicit false stays required");

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
if (prevLaunch === undefined) delete process.env.NEXT_PUBLIC_BRICLOG_LAUNCH;
else process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = prevLaunch;
if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercelEnv;
if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = prevNodeEnv;

console.log("OK: onboarding-friction");
