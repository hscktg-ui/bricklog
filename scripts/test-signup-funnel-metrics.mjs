/**
 * 가입 퍼널 집계 회귀 — node --import ./scripts/register-alias.mjs scripts/test-signup-funnel-metrics.mjs
 */
import {
  parseLoginFailPath,
  parseLoginIntentPath,
  parseSignupFunnelPath,
  parseSignupIntentPath,
} from "../lib/admin/signupFunnelMetrics.js";

const SIGNUP_INTENT_PATH_PREFIX = "__intent/signup:";
const SIGNUP_FUNNEL_PATH_PREFIX = "__funnel/signup:";
const LOGIN_INTENT_PATH_PREFIX = "__intent/login:";
const LOGIN_FAIL_PATH_PREFIX = "__funnel/login_fail:";

const intent = parseSignupIntentPath(`${SIGNUP_INTENT_PATH_PREFIX}public_test_quota`);
if (intent !== "public_test_quota") {
  console.error("FAIL: intent parse", intent);
  process.exit(1);
}

const funnel = parseSignupFunnelPath(
  `${SIGNUP_FUNNEL_PATH_PREFIX}modal_open:public_test_quota`
);
if (funnel?.step !== "modal_open" || funnel?.source !== "public_test_quota") {
  console.error("FAIL: funnel parse", funnel);
  process.exit(1);
}

const loginIntent = parseLoginIntentPath(`${LOGIN_INTENT_PATH_PREFIX}landing_nav`);
if (loginIntent !== "landing_nav") {
  console.error("FAIL: login intent parse", loginIntent);
  process.exit(1);
}

const loginFail = parseLoginFailPath(
  `${LOGIN_FAIL_PATH_PREFIX}invalid_credentials:landing_nav`
);
if (loginFail?.code !== "invalid_credentials" || loginFail?.source !== "landing_nav") {
  console.error("FAIL: login fail parse", loginFail);
  process.exit(1);
}

console.log("OK signup-funnel-metrics");
