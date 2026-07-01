/**
 * artifacts → ops_batch_snapshots (Supabase prod seed)
 * Run: npm run seed:ops-batch-snapshots
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  saveBatchSnapshot,
  loadBatchSnapshot,
  BATCH_SNAPSHOT_KEYS,
} from "../lib/ops/batchSummaryStore.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "").trim();
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function readJson(relPath) {
  const file = resolve(root, relPath);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
    process.exit(1);
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const seeds = [
    {
      key: BATCH_SNAPSHOT_KEYS.crossChannel,
      path: "artifacts/cross-channel-batch/latest-summary.json",
    },
    {
      key: BATCH_SNAPSHOT_KEYS.engineHealth,
      path: "artifacts/engine-health/latest-summary.json",
    },
  ];

  for (const { key, path } of seeds) {
    const payload = readJson(path);
    if (!payload) {
      console.warn("skip (missing):", path);
      continue;
    }
    const saved = await saveBatchSnapshot(key, payload, db);
    console.log(key, "→", saved.persisted, saved.reason || "");
  }

  for (const { key } of seeds) {
    const loaded = await loadBatchSnapshot(key, db);
    if (!loaded) {
      console.error("verify fail:", key);
      process.exit(1);
    }
    console.log("verify", key, loaded._snapshotSource || "ok");
  }

  console.log("OK seed-ops-batch-snapshots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
