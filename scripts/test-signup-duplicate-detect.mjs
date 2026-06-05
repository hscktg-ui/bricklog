import assert from "node:assert/strict";
import { isObfuscatedDuplicateSignup } from "../lib/auth/signupResponse.js";

assert.equal(isObfuscatedDuplicateSignup(null), false);
assert.equal(isObfuscatedDuplicateSignup(undefined), false);
assert.equal(isObfuscatedDuplicateSignup({ id: "x" }), false);
assert.equal(
  isObfuscatedDuplicateSignup({
    id: "x",
    identities: [{ provider: "email" }],
  }),
  false
);
assert.equal(
  isObfuscatedDuplicateSignup({
    id: "x",
    identities: [],
    confirmation_sent_at: "2026-01-01T00:00:00Z",
  }),
  false
);
assert.equal(
  isObfuscatedDuplicateSignup({
    id: "x",
    identities: [],
  }),
  true
);

console.log("OK: signup duplicate detection");
