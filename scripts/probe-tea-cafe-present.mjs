/**
 * 티카페 LLM 원고 → Safe Edit + 밀도 보강 → 송출용
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyGoldenSafeEdit } from "../lib/golden/goldenSafeEditEngine.js";
import { assessGoldenQualityGate } from "../lib/golden/goldenQualityGate.js";
import { deepenPackBodiesToMin } from "../lib/content/blogLengthDeepen.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { resolvePublishReadiness } from "../lib/product/publishReadinessDisplay.js";
import { stampContentQualityValue } from "../lib/product/contentQualityValue.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const parsed = JSON.parse(
  readFileSync(join(root, "artifacts", "probe-tea-cafe", "llm-parsed.json"), "utf8")
);

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
};

let pack = { ...parsed };
pack = applyGoldenSafeEdit(pack, INPUT);
pack = deepenPackBodiesToMin(pack, INPUT);
pack = applyGoldenSafeEdit(pack, INPUT);

const goldenGate = assessGoldenQualityGate(pack, INPUT);
pack._meta = {
  ...(pack._meta || {}),
  goldenGate,
  goldenGateScore: goldenGate.score,
  goldenGateVerdict: goldenGate.verdict,
  publishReady: goldenGate.score >= 90,
};
pack = stampContentQualityValue(pack, INPUT);

const full = getBlogFullText(pack);
const meta = {
  industry: "tea_cafe",
  chars: full.replace(/\s/g, "").length,
  goldenScore: goldenGate.score,
  verdict: goldenGate.verdict,
  publishReady: pack._meta?.publishReady,
  publishReadiness: resolvePublishReadiness(pack, INPUT),
};

writeFileSync(join(root, "artifacts", "probe-tea-cafe", "article-final.md"), full, "utf8");
writeFileSync(join(root, "artifacts", "probe-tea-cafe", "meta-final.json"), JSON.stringify(meta, null, 2), "utf8");

console.log(JSON.stringify(meta, null, 2));
console.log("\n---\n", full);
