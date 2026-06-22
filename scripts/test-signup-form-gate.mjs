/**
 * 가입 버튼 차단 사유 — disabled 대신 토스트 회귀
 */
import {
  isSignupSubmitLocked,
  resolveSignupBlockReason,
} from "../lib/auth/signupFormGate.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const base = {
  termsAgreed: true,
  emailRegistered: false,
  phoneOptional: false,
  phoneBlocksSignup: false,
  phoneAvailabilityBlocks: false,
  password: "secret9",
  passwordConfirm: "secret9",
};

assert("ready signup has no block", resolveSignupBlockReason(base) === "");
assert(
  "missing password confirm blocks",
  resolveSignupBlockReason({ ...base, passwordConfirm: "" }).includes("비밀번호 확인")
);
assert(
  "phone required blocks without sms",
  resolveSignupBlockReason({ ...base, phoneBlocksSignup: true }).includes("문자 인증")
);
assert("loading locks submit", isSignupSubmitLocked({ loading: true }));
assert(
  "missing terms does not lock button html",
  !isSignupSubmitLocked({ loading: false, signupLimited: false })
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: signup form gate");
