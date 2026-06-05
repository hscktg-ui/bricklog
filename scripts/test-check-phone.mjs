import assert from "node:assert/strict";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";
import {
  PHONE_ALREADY_REGISTERED_MESSAGE,
  resolvePhoneRegistered,
} from "@/lib/auth/checkPhoneServer";

assert.equal(normalizeKoreanMobile("010-1234-5678").e164, "01012345678");

const missing = await resolvePhoneRegistered("");
assert.equal(missing.ok, true);
assert.equal(missing.registered, false);
assert.equal(missing.valid, false);

const bad = await resolvePhoneRegistered("123");
assert.equal(bad.ok, true);
assert.equal(bad.registered, false);

const probe = await resolvePhoneRegistered("01099998888");
if (probe.ok) {
  assert.equal(typeof probe.registered, "boolean");
  console.log("probe 01099998888 registered:", probe.registered);
} else {
  console.log("probe skipped (no service key):", probe.message);
}

assert.match(PHONE_ALREADY_REGISTERED_MESSAGE, /이미 가입/);

console.log("OK: check-phone helpers");
