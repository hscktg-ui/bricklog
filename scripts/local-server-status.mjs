/**
 * 로컬 서버 접속 상태 안내 (Windows/macOS/Linux)
 * Run: npm run local:status
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ports = [3000, 3002, 3005];

async function probe(port) {
  const url = `http://127.0.0.1:${port}/`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: "manual" });
    clearTimeout(t);
    return { port, ok: true, status: res.status };
  } catch (err) {
    clearTimeout(t);
    return { port, ok: false, error: err?.name === "AbortError" ? "timeout" : "refused" };
  }
}

function lockHint() {
  try {
    readFileSync(join(root, ".next", "dev", "lock"));
    return "`.next/dev/lock` exists — stop other `next dev` / delete lock after stopping Node.";
  } catch {
    return null;
  }
}

const results = await Promise.all(ports.map(probe));
const up = results.filter((r) => r.ok);

console.log("\n=== BRICLOG local access ===\n");
for (const r of results) {
  if (r.ok) console.log(`  OK   http://localhost:${r.port}/  (HTTP ${r.status})`);
  else console.log(`  --   http://localhost:${r.port}/  (${r.error})`);
}

const hint = lockHint();
if (hint) console.log(`\n  Note: ${hint}`);

if (up.length === 0) {
  console.log(`
  Nothing is listening. Start one of:
    npm run build && npm run start:3005
    npm run dev          (port 3000; stop \`next start\` first if EPERM on .next)
    npm run dev:3005     (if 3000 is taken)
`);
} else {
  console.log(`\n  Open: http://localhost:${up[0].port}/\n`);
}

console.log(
  "  Dev + production at once: `.next` lock conflicts — use only one of `next dev` or `next start`.\n"
);
