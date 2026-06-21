/**
 * 서버 가입 register — payload·분기 회귀
 */
import { resolveSignupPhoneForSignup } from "../lib/auth/signupPhonePayload.js";

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
  "register payload includes verified phone",
  requiredPayload.contactPhone === "010-1234-5678" &&
    requiredPayload.signupPhoneVerificationId === "otp-abc-123"
);

const unverified = resolveSignupPhoneForSignup({
  phoneSmsVerified: false,
  phoneVerificationId: null,
  signupPhone: "",
});

assert(
  "optional phone signup sends empty phone fields",
  unverified.contactPhone === "" && unverified.signupPhoneVerificationId === null
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: signup register payload");
