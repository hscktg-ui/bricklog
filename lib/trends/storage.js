import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data", "trend-snapshots");

function ensureDir() {
  try {
    if (!fs.existsSync(DIR)) {
      fs.mkdirSync(DIR, { recursive: true });
    }
    return true;
  } catch {
    // Vercel 등 read-only 런타임에서는 스냅샷 디렉터리 생성이 불가할 수 있다.
    return false;
  }
}

export function saveSnapshot(snapshot) {
  if (!ensureDir()) {
    throw new Error("trend_snapshot_dir_not_writable");
  }
  const file = path.join(DIR, `${snapshot.dateKst}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
  fs.writeFileSync(
    path.join(DIR, "latest.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  return file;
}

export function loadSnapshot(dateKst) {
  try {
    ensureDir();
    const file = dateKst
      ? path.join(DIR, `${dateKst}.json`)
      : path.join(DIR, "latest.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function listSnapshotDates() {
  try {
    ensureDir();
    if (!fs.existsSync(DIR)) return [];
    return fs
      .readdirSync(DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace(".json", ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
