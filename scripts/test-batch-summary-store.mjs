/**
 * batch summary store — local round-trip
 */
import assert from "node:assert/strict";
import { saveBatchSnapshot, loadBatchSnapshot, BATCH_SNAPSHOT_KEYS } from "../lib/ops/batchSummaryStore.js";

const payload = {
  passRate: 82.5,
  total: 4,
  pass: 3,
  failReasons: { human_belief_low: 1 },
  startedAt: new Date().toISOString(),
};

const saved = await saveBatchSnapshot(BATCH_SNAPSHOT_KEYS.engineHealth, payload);
assert.equal(saved.ok, true);

const loaded = await loadBatchSnapshot(BATCH_SNAPSHOT_KEYS.engineHealth);
assert.equal(loaded.passRate, 82.5);
assert.ok(loaded.storedAt);

console.log("OK batch-summary-store", saved.persisted);
