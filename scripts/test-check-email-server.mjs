/**
 * 이메일 lookup — getUserByEmail 미지원 회귀
 */
import { validateEmailFormat } from "../lib/auth/emailFormat.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

assert("valid email normalizes", validateEmailFormat("  Test@Example.COM ").value === "test@example.com");
assert("invalid email rejected", !validateEmailFormat("bad").ok);
assert("empty email rejected", !validateEmailFormat("").ok);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: email format + lookup prerequisites");
