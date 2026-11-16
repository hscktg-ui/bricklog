import { readFileSync } from "fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* no env file */
  }
}

loadEnvLocal();

const {
  saveBatchSnapshot,
  BATCH_SNAPSHOT_KEYS,
  loadLatestCrossChannelBatchSummary,
} = await import("../lib/ops/batchSummaryStore.js");

const summary = JSON.parse(
  readFileSync("artifacts/cross-channel-batch/latest-summary.json", "utf8")
);
console.log("env", {
  url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
});
const saved = await saveBatchSnapshot(BATCH_SNAPSHOT_KEYS.crossChannel, summary);
console.log("saved", saved);
const loaded = await loadLatestCrossChannelBatchSummary();
console.log({
  source: loaded?._snapshotSource,
  passRate: loaded?.passRate,
  finishedAt: loaded?.finishedAt,
  updated: loaded?._snapshotUpdatedAt,
});
