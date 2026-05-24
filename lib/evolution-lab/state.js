import fs from "fs";
import path from "path";

const RUNS_DIR = path.join(process.cwd(), ".data", "evolution-lab", "runs");

let activeRun = null;

function ensureDir() {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
}

function runPath(id) {
  return path.join(RUNS_DIR, `${id}.json`);
}

export function persistLabRun(run) {
  try {
    ensureDir();
    fs.writeFileSync(runPath(run.id), JSON.stringify(run, null, 0), "utf8");
  } catch {
    /* optional disk */
  }
}

export function loadLabRunFromDisk(id) {
  try {
    return JSON.parse(fs.readFileSync(runPath(id), "utf8"));
  } catch {
    return null;
  }
}

export function getActiveLabRun() {
  return activeRun;
}

export function setActiveLabRun(run) {
  activeRun = run;
  if (run) persistLabRun(run);
}

export function loadLatestLabRunSync() {
  try {
    ensureDir();
    const files = fs
      .readdirSync(RUNS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        f,
        mtime: fs.statSync(path.join(RUNS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files[0]) return null;
    return JSON.parse(
      fs.readFileSync(path.join(RUNS_DIR, files[0].f), "utf8")
    );
  } catch {
    return null;
  }
}
