import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data", "trend-snapshots");

function ensureDir() {
  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true });
  }
}

export function saveSnapshot(snapshot) {
  ensureDir();
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
  ensureDir();
  const file = dateKst
    ? path.join(DIR, `${dateKst}.json`)
    : path.join(DIR, "latest.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function listSnapshotDates() {
  ensureDir();
  return fs
    .readdirSync(DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();
}
