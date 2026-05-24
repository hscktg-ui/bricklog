import fs from "fs";
import path from "path";

const DEV_DIR = path.join(process.cwd(), ".data", "daily-runs");
const PIPELINE_VERSION = "1";

export function isMissingSnapshotTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /daily_usage_snapshots/i.test(msg)
  );
}

function ensureDevDir() {
  if (!fs.existsSync(DEV_DIR)) {
    fs.mkdirSync(DEV_DIR, { recursive: true });
  }
}

export function saveDevSnapshot(snapshot) {
  ensureDevDir();
  const date = snapshot.metrics?.snapshotDate || snapshot.snapshotDate;
  const file = path.join(DEV_DIR, `${date}.json`);
  const payload = {
    pipelineVersion: PIPELINE_VERSION,
    ranAt: snapshot.ranAt || new Date().toISOString(),
    metrics: snapshot.metrics,
    learning: snapshot.learning,
    idempotent: snapshot.idempotent ?? false,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(DEV_DIR, "latest.json"),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
  return file;
}

export function loadDevSnapshot(dateStr) {
  ensureDevDir();
  const file = dateStr
    ? path.join(DEV_DIR, `${dateStr}.json`)
    : path.join(DEV_DIR, "latest.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export async function loadDbSnapshot(db, snapshotDate) {
  const { data, error } = await db
    .from("daily_usage_snapshots")
    .select("snapshot_date, metrics, ran_at, pipeline_version")
    .eq("snapshot_date", snapshotDate)
    .maybeSingle();
  if (error) {
    if (isMissingSnapshotTable(error)) return { missingTable: true, row: null };
    throw error;
  }
  return { missingTable: false, row: data };
}

export async function saveDbSnapshot(db, snapshot) {
  const date = snapshot.metrics?.snapshotDate;
  const row = {
    snapshot_date: date,
    metrics: {
      ...snapshot.metrics,
      learning: snapshot.learning,
    },
    pipeline_version: PIPELINE_VERSION,
    ran_at: snapshot.ranAt || new Date().toISOString(),
  };
  const { data, error } = await db
    .from("daily_usage_snapshots")
    .upsert(row, { onConflict: "snapshot_date" })
    .select("snapshot_date, ran_at")
    .single();
  if (error) {
    if (isMissingSnapshotTable(error)) return { ok: false, missingTable: true };
    throw error;
  }
  return { ok: true, data };
}

export async function loadLatestDbSnapshot(db) {
  const { data, error } = await db
    .from("daily_usage_snapshots")
    .select("snapshot_date, metrics, ran_at, pipeline_version")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingSnapshotTable(error)) return { missingTable: true, row: null };
    throw error;
  }
  return { missingTable: false, row: data };
}
