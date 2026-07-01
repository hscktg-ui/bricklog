/**
 * Cross-channel · engine-health 배치 요약 — Supabase 영속 + 로컬 artifacts 폴백
 */
import fs from "fs";
import path from "path";
import { createServiceSupabase } from "@/lib/supabase/server";

export const BATCH_SNAPSHOT_KEYS = Object.freeze({
  crossChannel: "cross_channel_batch_latest",
  engineHealth: "engine_health_latest",
});

const ARTIFACT_PATHS = Object.freeze({
  [BATCH_SNAPSHOT_KEYS.crossChannel]: [
    "artifacts",
    "cross-channel-batch",
    "latest-summary.json",
  ],
  [BATCH_SNAPSHOT_KEYS.engineHealth]: [
    "artifacts",
    "engine-health",
    "latest-summary.json",
  ],
});

export function isMissingOpsBatchSnapshotsTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /ops_batch_snapshots/i.test(msg)
  );
}

function readLocalSnapshot(snapshotKey) {
  const rel = ARTIFACT_PATHS[snapshotKey];
  if (!rel) return null;
  try {
    const file = path.join(process.cwd(), ...rel);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeLocalSnapshot(snapshotKey, payload) {
  const rel = ARTIFACT_PATHS[snapshotKey];
  if (!rel) return false;
  try {
    const file = path.join(process.cwd(), ...rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} [db]
 */
export async function loadBatchSnapshot(snapshotKey, db = null) {
  const client = db || createServiceSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from("ops_batch_snapshots")
        .select("payload, updated_at")
        .eq("snapshot_key", snapshotKey)
        .maybeSingle();
      if (!error && data?.payload) {
        return {
          ...data.payload,
          _snapshotSource: "supabase",
          _snapshotUpdatedAt: data.updated_at,
        };
      }
      if (error && !isMissingOpsBatchSnapshotsTable(error)) {
        throw error;
      }
    } catch (err) {
      if (!isMissingOpsBatchSnapshotsTable(err)) throw err;
    }
  }
  const local = readLocalSnapshot(snapshotKey);
  if (local) {
    return { ...local, _snapshotSource: "local_artifact" };
  }
  return null;
}

export async function saveBatchSnapshot(snapshotKey, payload = {}, db = null) {
  const body = {
    ...payload,
    snapshotKey,
    storedAt: new Date().toISOString(),
  };
  writeLocalSnapshot(snapshotKey, body);

  const client = db || createServiceSupabase();
  if (!client) {
    return { ok: true, persisted: "local_only", snapshotKey };
  }

  try {
    const { error } = await client.from("ops_batch_snapshots").upsert(
      {
        snapshot_key: snapshotKey,
        payload: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "snapshot_key" }
    );
    if (error) {
      if (isMissingOpsBatchSnapshotsTable(error)) {
        return { ok: true, persisted: "local_only", snapshotKey, reason: "table_missing" };
      }
      throw error;
    }
    return { ok: true, persisted: "supabase", snapshotKey };
  } catch (err) {
    if (isMissingOpsBatchSnapshotsTable(err)) {
      return { ok: true, persisted: "local_only", snapshotKey, reason: "table_missing" };
    }
    throw err;
  }
}

export async function loadLatestCrossChannelBatchSummary(db = null) {
  return loadBatchSnapshot(BATCH_SNAPSHOT_KEYS.crossChannel, db);
}

export async function loadLatestEngineHealthSummary(db = null) {
  return loadBatchSnapshot(BATCH_SNAPSHOT_KEYS.engineHealth, db);
}
