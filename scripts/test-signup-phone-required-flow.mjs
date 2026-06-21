/**
 * 가입 휴대폰 필수 모드 — OTP 연결·activate 회귀
 * (AuthForm useOptionalPhone 버그: 필수 모드에서 phone-hold/activate 미실행)
 */
import {
  resolveSignupPhoneForSignup,
  shouldRunSignupActivate,
  isSignupEmailConfirmedOnServer,
} from "../lib/auth/signupPhonePayload.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const verified = {
  phoneSmsVerified: true,
  phoneVerificationId: "otp-abc-123",
  signupPhone: "010-1234-5678",
};

const requiredPayload = resolveSignupPhoneForSignup(verified);
assert(
  "required mode attaches verified phone to signup payload",
  requiredPayload.phoneVerifiedForSignup === true &&
    requiredPayload.contactPhone === "010-1234-5678" &&
    requiredPayload.signupPhoneVerificationId === "otp-abc-123"
);

assert(
  "required mode runs phone-hold when verified",
  Boolean(requiredPayload.signupPhoneVerificationId && requiredPayload.contactPhone)
);

assert(
  "required mode skips activate after successful phone-hold",
  shouldRunSignupActivate({
    hasSession: false,
    phoneVerifiedForSignup: true,
    phoneHoldOk: true,
  }) === false
);

assert(
  "required mode runs activate if phone-hold did not run (legacy bug path)",
  shouldRunSignupActivate({
    hasSession: false,
    phoneVerifiedForSignup: true,
    phoneHoldOk: false,
  }) === true
);

const unverified = resolveSignupPhoneForSignup({
  phoneSmsVerified: false,
  phoneVerificationId: null,
  signupPhone: "",
});

assert(
  "email-only signup has empty phone payload",
  unverified.contactPhone === "" && unverified.signupPhoneVerificationId === null
);

assert(
  "email-only signup runs activate without session",
  shouldRunSignupActivate({
    hasSession: false,
    phoneVerifiedForSignup: false,
    phoneHoldOk: false,
  }) === true
);

assert(
  "session present skips activate",
  shouldRunSignupActivate({
    hasSession: true,
    phoneVerifiedForSignup: false,
    phoneHoldOk: false,
  }) === false
);

assert(
  "phone-hold marks email confirmed on server",
  isSignupEmailConfirmedOnServer({
    hasSession: false,
    phoneHoldOk: true,
    activateOk: false,
  })
);

assert(
  "activate marks email confirmed on server",
  isSignupEmailConfirmedOnServer({
    hasSession: false,
    phoneHoldOk: false,
    activateOk: true,
  })
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: signup phone required flow payload");
