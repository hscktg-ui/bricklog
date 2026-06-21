/**
 * 가입 직후 로그인 폴백 — ensure-email-active 판단 회귀
 */
import {
  ENSURE_EMAIL_ACTIVE_MAX_AGE_MS,
  isRecentSignupUser,
  shouldAttemptEmailConfirmAfterAuthError,
  userNeedsEmailConfirm,
} from "../lib/auth/ensureEmailActiveServer.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const now = Date.parse("2026-06-13T12:00:00.000Z");

assert(
  "email not confirmed triggers confirm path",
  shouldAttemptEmailConfirmAfterAuthError("Email not confirmed")
);
assert(
  "invalid login credentials triggers confirm path",
  shouldAttemptEmailConfirmAfterAuthError("Invalid login credentials")
);
assert(
  "wrong password on old account does not auto-confirm",
  !shouldAttemptEmailConfirmAfterAuthError("User banned")
);

assert(
  "recent signup within window",
  isRecentSignupUser(
    { created_at: new Date(now - ENSURE_EMAIL_ACTIVE_MAX_AGE_MS + 60_000).toISOString() },
    now
  )
);
assert(
  "stale signup outside window",
  !isRecentSignupUser(
    { created_at: new Date(now - ENSURE_EMAIL_ACTIVE_MAX_AGE_MS - 1).toISOString() },
    now
  )
);

assert(
  "unconfirmed user needs confirm",
  userNeedsEmailConfirm({ email_confirmed_at: null })
);
assert(
  "confirmed user skips confirm",
  !userNeedsEmailConfirm({ email_confirmed_at: "2026-06-13T11:00:00.000Z" })
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: post-signup session helpers");
