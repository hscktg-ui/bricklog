/**
 * Council wedge 20 — 업종 다양 · contract 축만 검증 (업종 패치 금지)
 * Run: npm run test:council-wedge-batch
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWritingContract } from "../lib/content/writingContract.js";
import { assessPreGenerationNorthStar } from "../lib/product/northStarDeliveryKpi.js";
import {
  COUNCIL_WEDGE_PERSONAS,
  COUNCIL_WEDGE_VERSION,
} from "../lib/council/councilWedgePersonas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const results = COUNCIL_WEDGE_PERSONAS.map((p) => {
  const input = {
    brandName: p.brandName,
    region: p.region,
    topic: p.topic,
    industry: p.industry,
  };
  const contract = resolveWritingContract(input);
  const pre = assessPreGenerationNorthStar(input);

  const visitMatch = contract.visitToneAllowed === p.expectVisit;
  const philosophyOk = p.expectPhilosophy
    ? contract.type === "brand_philosophy"
    : contract.type !== "brand_philosophy" || p.brandName !== "브릭로그";
  const briclogProductOk =
    p.brandName === "브릭로그" && !p.expectPhilosophy
      ? contract.type === "product_guide"
      : true;
  const planOk = pre.monthlyPlanReady;

  const pass = visitMatch && philosophyOk && briclogProductOk && planOk;

  return {
    id: p.id,
    industry: p.industry,
    contractType: contract.type,
    visitToneAllowed: contract.visitToneAllowed,
    pass,
    failures: [
      !visitMatch && "visit_mismatch",
      !philosophyOk && "philosophy_wrong",
      !briclogProductOk && "briclog_product_wrong",
      !planOk && "plan_not_ready",
    ].filter(Boolean),
  };
});

const pass = results.filter((r) => r.pass).length;
const summary = {
  version: COUNCIL_WEDGE_VERSION,
  at: new Date().toISOString(),
  total: results.length,
  pass,
  passRate: Math.round((pass / results.length) * 1000) / 10,
  principle: "axis-only — no per-industry rule files",
  results,
};

const outDir = join(root, "artifacts", "council-wedge-batch");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(
    "FAIL council-wedge:",
    failed.map((r) => `${r.id}:${r.failures.join(",")}`).join(" | ")
  );
  process.exit(1);
}

console.log(`OK council-wedge-batch (${pass}/${results.length})`);
console.log(`Report: ${join(outDir, "latest-summary.json")}`);
