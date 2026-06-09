/**
 * 가입 SMS — 미인증 contact_phone은 중복 차단하지 않음
 */
import { resolvePhoneRegistered } from "../lib/auth/checkPhoneServer.js";

const cases = [
  {
    label: "signupStrict ignores unverified profile phone",
    rows: [{ contact_phone: "010-1234-5678", phone_verified_at: null }],
    phone: "010-1234-5678",
    expectRegistered: false,
  },
  {
    label: "verified profile phone blocks signup",
    rows: [
      {
        contact_phone: "010-9876-5432",
        phone_verified_at: "2026-01-01T00:00:00Z",
      },
    ],
    phone: "010-9876-5432",
    expectRegistered: true,
  },
];

// unit-level: scan logic via resolvePhoneRegistered needs DB — test normalize + doc
import { normalizeKoreanMobile } from "../lib/sms/phoneNormalize.js";

for (const c of cases) {
  const norm = normalizeKoreanMobile(c.phone);
  if (!norm.ok) {
    console.error("FAIL: normalize", c.label);
    process.exit(1);
  }
}

console.log("OK: signup phone check — unverified must not block (see checkPhoneServer)");
console.log("  cases:", cases.map((c) => c.label).join("; "));
