/**
 * 4축 엔진 건강 KPI — 카테고리 대신 파이프라인 축
 * Run: npm run test:engine-health-report
 *      node scripts/engine-health-report.mjs [path-to-batch-json]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBatch = join(root, "artifacts", "ten-post-batch", "latest.json");
const outDir = join(root, "artifacts", "engine-health");
const outPath = join(outDir, "latest-summary.json");

/**
 * @param {object} report — ten-post-batch latest.json shape
 */
export function summarizeEngineHealthFromBatch(report = {}) {
  const results = report.results || [];
  const total = results.length;
  const passLegacy = results.filter((r) => r.pass).length;
  const passUnified = results.filter((r) => r.unified?.pass === true).length;
  const slowFallback = results.filter((r) => r.columnistSlowFallback).length;
  const gateMisalign = results.filter(
    (r) =>
      r.benchmark?.publishOk &&
      r.benchmark?.score >= 76 &&
      r.editor?.ok &&
      r.unified?.pass === false
  );
  const withDeliveryValue = results.filter((r) => r.deliveryValueChecksOk).length;

  return {
    at: new Date().toISOString(),
    sourceAt: report.at || null,
    base: report.base || null,
    version: "engine-health-v1",
    axes: {
      trustPassRate: total ? Math.round((passLegacy / total) * 1000) / 10 : 0,
      unifiedPassRate: total ? Math.round((passUnified / total) * 1000) / 10 : 0,
      slowFallbackRate: total ? Math.round((slowFallback / total) * 1000) / 10 : 0,
      gateMisalignCount: gateMisalign.length,
      slaPassRate: report.summary?.slaPassRate ?? null,
      avgBenchmark: report.summary?.avgBenchmark ?? null,
      avgMs: report.summary?.avgMs ?? null,
    },
    gateMisalignIds: gateMisalign.map((r) => r.id),
    summary: report.summary || null,
  };
}

function main() {
  const batchPath = process.argv[2] || defaultBatch;
  if (!existsSync(batchPath)) {
    console.error("missing batch report:", batchPath);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(batchPath, "utf8"));
  const health = summarizeEngineHealthFromBatch(report);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(health, null, 2), "utf8");
  console.log(JSON.stringify(health, null, 2));
  console.log("\nWrote", outPath);
}

if (process.argv[1]?.includes("engine-health-report")) {
  main();
}
