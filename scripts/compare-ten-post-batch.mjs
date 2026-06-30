/**
 * 10건 배치 전후 비교표
 * Run: node scripts/compare-ten-post-batch.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "artifacts", "ten-post-batch");
const beforePath = join(dir, "latest-pre-slow-fallback.json");
const afterPath = join(dir, "latest.json");
const outPath = join(dir, "comparison-slow-fallback.md");

function load(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

const before = load(beforePath);
const after = load(afterPath);
if (!after) {
  console.error("missing", afterPath);
  process.exit(1);
}

const beforeById = new Map((before?.results || []).map((r) => [r.id, r]));
const lines = [
  "# 10건 배치 전후 비교 (slow columnist fallback)",
  "",
  `| 항목 | 이전 | 이후 |`,
  `|------|------|------|`,
  `| 시각 | ${before?.at || "—"} | ${after.at} |`,
  `| 성공률 | ${before?.summary?.passRate ?? "?"}% | **${after.summary?.passRate}%** |`,
  `| 평균 벤치 | ${before?.summary?.avgBenchmark ?? "?"} | ${after.summary?.avgBenchmark} |`,
  `| 평균 ms | ${before?.summary?.avgMs ?? "?"} | ${after.summary?.avgMs} |`,
  `| SLA 통과 | ${before?.summary?.slaPassRate ?? "?"}% | ${after.summary?.slaPassRate}% |`,
  "",
  "## 시나리오별",
  "",
  "| id | 이전 | 이후 | slow-fb | 실패코드 |",
  "|----|------|------|---------|----------|",
];

for (const row of after.results || []) {
  const prev = beforeById.get(row.id);
  const prevCell = prev?.pass
    ? `✓ ${prev.benchmark?.score ?? ""}`
    : `✗ ${prev?.mode || prev?.error?.slice(0, 20) || "—"}`;
  const nextCell = row.pass
    ? `✓ ${row.benchmark?.score}(${row.benchmark?.grade})`
    : `✗ ${row.mode || ""}`;
  const slow = row.columnistSlowFallback ? "yes" : "—";
  const code = row.columnistFailDiagnostic?.code || "—";
  lines.push(`| ${row.id} | ${prevCell} | ${nextCell} | ${slow} | ${code} |`);
}

const focus = ["mattress", "interior", "salon"];
const focusFails = (after.results || []).filter((r) => focus.includes(r.id) && !r.pass);
if (focusFails.length) {
  lines.push("", "## 매트리스·인테리어·미용실 진단", "");
  for (const r of focusFails) {
    lines.push(`- **${r.id}**: \`${r.columnistFailDiagnostic?.code || r.mode}\` score=${r.columnistFailDiagnostic?.score ?? "—"} chars=${r.columnistFailDiagnostic?.chars ?? "—"} hardFails=${(r.columnistFailDiagnostic?.hardFails || []).join(",") || "—"}`);
  }
}

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
console.log(`\nWrote ${outPath}`);
