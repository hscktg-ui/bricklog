/**
 * 가입 퍼널 집계 회귀
 */
import {
  parseSignupFunnelPath,
  parseSignupIntentPath,
} from "../lib/admin/signupFunnelMetrics.js";

const SIGNUP_INTENT_PATH_PREFIX = "__intent/signup:";
const SIGNUP_FUNNEL_PATH_PREFIX = "__funnel/signup:";

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

console.log("OK signup-funnel-metrics");
