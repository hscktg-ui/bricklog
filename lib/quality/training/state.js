import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "quality-training", "runs");

let activeRun = null;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function runPath(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

export function persistRun(run) {
  try {
    ensureDir();
    fs.writeFileSync(runPath(run.id), JSON.stringify(run, null, 0), "utf8");
  } catch {
    /* disk optional */
  }
}

export function loadRunFromDisk(id) {
  try {
    const raw = fs.readFileSync(runPath(id), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getActiveRun() {
  return activeRun;
}

export function setActiveRun(run) {
  activeRun = run;
  if (run) persistRun(run);
}

export function clearActiveRun() {
  activeRun = null;
}

export function getLatestReport() {
  if (activeRun?.report) return activeRun.report;
  const run = loadLatestRunSync();
  return run?.report || null;
}

export function loadLatestRunSync() {
  try {
    ensureDir();
    const files = fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        f,
        mtime: fs.statSync(path.join(DATA_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files[0]) return null;
    return JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, files[0].f), "utf8")
    );
  } catch {
    return null;
  }
}

export async function loadLatestRun() {
  return loadLatestRunSync();
}

