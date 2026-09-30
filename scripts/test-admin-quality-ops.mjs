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
assert.equal(
  snap.rollout.some((item) => String(item.watch).includes("89.7")),
  false,
  "checklist must not freeze an old blog pass rate"
);

if (snap.crossChannel?.freshness?.stale) {
  assert.ok(
    snap.alerts.some((a) => a.id === "cross_batch_stale" && a.severity === "warn"),
    "stale batch must warn"
  );
}
if (snap.channelSla?.skipped) {
  assert.ok(
    snap.alerts.some((a) => a.id === "channel_sla_skipped"),
    "skipped SLA must alert"
  );
}

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
