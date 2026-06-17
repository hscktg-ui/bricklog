import assert from "node:assert/strict";
import { getQualityOpsSnapshot, OPERATOR_ROLLOUT_CHECKLIST } from "../lib/admin/qualityOpsSnapshot.js";

const snap = getQualityOpsSnapshot();

assert.ok(snap.generatedAt, "generatedAt");
assert.ok(Array.isArray(snap.rollout) && snap.rollout.length >= 5, "rollout checklist");
assert.equal(snap.rollout.length, OPERATOR_ROLLOUT_CHECKLIST.length, "rollout SSOT");
assert.ok(snap.targets.blog === 90, "blog target 90");
assert.ok(Array.isArray(snap.deliveryTrust.tiers) && snap.deliveryTrust.tiers.length === 3);
assert.ok(Array.isArray(snap.commands) && snap.commands.length >= 3);
assert.ok(snap.dataSources && typeof snap.dataSources.prodNote === "string");

if (snap.crossChannel) {
  assert.ok(snap.crossChannel.byChannel?.blog, "blog channel when batch exists");
  assert.ok(typeof snap.crossChannel.passRate === "number", "passRate number");
}

if (snap.readiness) {
  assert.ok(Array.isArray(snap.readiness.functional), "functional rubric");
  assert.ok(Array.isArray(snap.readiness.gaps), "gaps");
}

console.log("test:admin-quality-ops OK", {
  crossChannel: snap.crossChannel?.passRate ?? null,
  blog: snap.crossChannel?.byChannel?.blog?.passRate ?? null,
  readiness: snap.readiness?.total ?? null,
  alerts: snap.alerts?.length ?? 0,
});
