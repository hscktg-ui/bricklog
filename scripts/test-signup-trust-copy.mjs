/**
 * 가입 — 출시 빌드 기본 휴대폰 필수 + 신뢰 카피
 */
import assert from "node:assert/strict";
import { isLaunchBuild, isSignupPhoneOptional } from "../lib/config/productFlags.js";
import { getSignupTrustCopy } from "../lib/auth/signupTrustCopy.js";

const prevPhone = process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
const prevLaunch = process.env.NEXT_PUBLIC_BRICLOG_LAUNCH;
const prevNodeEnv = process.env.NODE_ENV;
const prevFree = process.env.BRICLOG_FREE_LAUNCH;

delete process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = "false";
process.env.NODE_ENV = "development";
assert.equal(isSignupPhoneOptional(), true, "dev default keeps phone optional");

process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = "true";
assert.equal(isSignupPhoneOptional(), true, "launch build stays optional");

process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "true";
assert.equal(isSignupPhoneOptional(), true, "explicit true optional");

process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "required";
assert.equal(isSignupPhoneOptional(), false, "explicit required stays required");

process.env.VERCEL_ENV = "production";
process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = "true";
assert.equal(isSignupPhoneOptional(), true, "production optional unless required");

delete process.env.VERCEL_ENV;

process.env.BRICLOG_FREE_LAUNCH = "false";
const paidCopy = getSignupTrustCopy({
  phoneRequired: true,
  smsSenderLabel: "070-8844-7209",
});
assert.match(paidCopy.body, /브릭로그/);
assert.match(paidCopy.body, /이메일 인증 링크는 보내지 않습니다/);
assert.match(paidCopy.planHint || "", /월 5회/);

process.env.BRICLOG_FREE_LAUNCH = "true";
const freeCopy = getSignupTrustCopy({ phoneRequired: true });
assert.match(freeCopy.planHint || "", /무료/);

const draftCopy = getSignupTrustCopy({
  phoneRequired: false,
  publicTestDraft: { brandName: "테스트카페" },
});
assert.match(draftCopy.body, /테스트카페/);
assert.match(draftCopy.onboardingHint || "", /복원/);

if (prevPhone === undefined) delete process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL;
else process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL = prevPhone;
if (prevLaunch === undefined) delete process.env.NEXT_PUBLIC_BRICLOG_LAUNCH;
else process.env.NEXT_PUBLIC_BRICLOG_LAUNCH = prevLaunch;
if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = prevNodeEnv;
if (prevFree === undefined) delete process.env.BRICLOG_FREE_LAUNCH;
else process.env.BRICLOG_FREE_LAUNCH = prevFree;

void isLaunchBuild;

console.log("OK: signup-trust-copy");
