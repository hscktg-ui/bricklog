/**
 * Mission prose fallback + 글자수 검증
 */
import { buildMissionProseFallbackPack, isCoverageSlotDumpPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { scoreBriclogEngine } from "../lib/product/briclogEngineScore.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  mainKeyword: "오피모 전시 소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "파주 — 파주 매장 체험·행사 조건" },
    { fact: "파주 매장 예약·상담 가능" },
    { fact: "오피모 전시 라인업 체험 가능" },
  ],
};

const raw = buildMissionProseFallbackPack(INPUT);
const improved = applyV17PostWritePack(raw, { input: INPUT, ...INPUT }, "blog");
const tier = resolveBlogLengthTier("medium");
const chars = countBlogBodyCharsWithSpaces(improved);
const full = getBlogFullText(improved);
const engine = scoreBriclogEngine(improved, { input: INPUT, ...INPUT });
const checklist = scoreChecklistVoice(full, improved);

console.log("=== mission prose fallback ===");
console.log("title:", improved.title);
console.log("sections:", improved.sections?.length);
console.log("chars:", chars, "target min:", tier.min, "max:", tier.max);
console.log("lengthOk:", chars >= tier.min && chars <= tier.max);
if (chars < tier.min) process.exitCode = 1;
console.log("engine:", engine.total, engine.ok, engine.issues.join(", ") || "none");
console.log("checklist:", checklist.ok, "confirmRatio:", checklist.confirmRatio.toFixed(2));
console.log("coverageDump:", isCoverageSlotDumpPack(improved));
console.log("당일당일:", (full.match(/당일\s+당일/g) || []).length);
const paras = full.split(/\n\n+/).filter((p) => p.trim().length > 20);
const dupes = paras.length - new Set(paras.map((p) => p.replace(/\s/g, "").slice(0, 48))).size;
console.log("duplicate paragraphs:", dupes);
console.log("확인하세요:", (full.match(/확인하세요/g) || []).length);
console.log("\n--- opener ---");
console.log(String(improved.sections?.[0]?.body || "").slice(0, 320));
