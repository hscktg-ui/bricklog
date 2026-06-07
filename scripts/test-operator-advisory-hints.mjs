import {
  hintForErrorMessage,
  hintForFailReason,
  isLikelyStaleUniformErrors,
} from "../lib/admin/operatorErrorHints.js";

const err = hintForErrorMessage("e.test is not a function");
if (!err?.staleIfUniform) {
  console.error("FAIL: e.test hint");
  process.exit(1);
}

const stale = isLikelyStaleUniformErrors(
  [
    { message: "e.test is not a function" },
    { message: "e.test is not a function" },
  ],
  "e.test is not a function"
);
if (!stale) {
  console.error("FAIL: stale uniform detection");
  process.exit(1);
}

const fail = hintForFailReason("human_belief_low");
if (!fail?.summary?.includes("조사")) {
  console.error("FAIL: human_belief hint");
  process.exit(1);
}

console.log("OK operator-advisory-hints");
