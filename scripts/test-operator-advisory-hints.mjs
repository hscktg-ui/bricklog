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

import { classifyEngineOpsNote } from "../lib/admin/engineOpsNotePriority.js";
import { hasCriticalNowAction } from "../lib/admin/engineOpsNotePriority.js";

const brandOff = classifyEngineOpsNote(
  "BRICLOG_BRAND_FIRST_ENGINE 꺼짐 — 사용자별 브랜드 앵커 미적용"
);
if (brandOff.priority !== "watch" || brandOff.critical) {
  console.error("FAIL: brand first should be watch non-critical", brandOff);
  process.exit(1);
}

const schema = classifyEngineOpsNote("schema-v15-global-engine-rules.sql 미적용");
if (schema.priority !== "now" || !schema.critical) {
  console.error("FAIL: schema missing should be critical now", schema);
  process.exit(1);
}

if (
  hasCriticalNowAction([
    { priority: "watch", critical: false, id: "engine_x" },
    { priority: "watch", critical: false, id: "errors_today" },
  ])
) {
  console.error("FAIL: should not be critical now");
  process.exit(1);
}

console.log("OK operator-advisory-hints");
