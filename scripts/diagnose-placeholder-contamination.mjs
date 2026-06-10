/**
 * Placeholder 오염 진단 — 생성 전 변수·재검수 단계별 비교
 * Run: node --import ./scripts/register-alias.mjs scripts/diagnose-placeholder-contamination.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  detectEmptyInputVars,
  countPlaceholderContamination,
  detectPlaceholderContamination,
} from "../lib/content/placeholderContaminationEngine.js";
import { capTopicMentionsOnPack } from "../lib/content/humanEditorGuardPass.js";
import { applyHumanEditorGuardPass } from "../lib/content/humanEditorGuardPass.js";
import { applyAntiSeoSpamGate } from "../lib/content/antiSeoSpamGate.js";
import { weaveTopicDominanceIntoPack } from "../lib/content/v13ContentGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const INPUT = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
  storeFeatures: "수제 브런치·로스팅 원두",
  blogLengthTier: "short",
};

function reportStage(label, pack, input) {
  const full = getBlogFullText(pack);
  const counts = countPlaceholderContamination(full);
  console.log(`\n--- ${label} ---`);
  console.log("chars:", full.replace(/\s/g, "").length);
  console.log("placeholder hits:", counts.total, counts.hits);
  if (counts.total > 0) {
    const sample = full.slice(0, 280).replace(/\s+/g, " ");
    console.log("excerpt:", sample);
  }
  return counts;
}

console.log("=== PLACEHOLDER CONTAMINATION DIAGNOSIS ===\n");

console.log("1) 생성 전 변수 치환 상태");
const emptyCheck = detectEmptyInputVars(INPUT);
console.log("  empty vars:", emptyCheck.empty.length ? emptyCheck.empty : "(none)");
for (const key of ["brandName", "region", "topic", "mainKeyword", "industry", "storeFeatures"]) {
  const v = INPUT[key];
  console.log(`  ${key}:`, v == null ? "null" : v === "" ? '""' : JSON.stringify(v));
}

let pack;
const probePath = join(root, "artifacts/probe-tea-cafe/llm-parsed.json");
if (existsSync(probePath)) {
  pack = JSON.parse(readFileSync(probePath, "utf8"));
  console.log("\n2) 생성 직후 (llm-parsed fixture)");
} else {
  pack = buildMissionProseFallbackPack(INPUT);
  console.log("\n2) 생성 직후 (missionProseFallback)");
}
reportStage("raw", pack, INPUT);

console.log("\n3) 재검수 단계별 placeholder 주입 추적");
const stages = [
  ["capTopicMentionsOnPack", (p) => capTopicMentionsOnPack(p, INPUT, 3)],
  ["applyAntiSeoSpamGate", (p) => applyAntiSeoSpamGate(p, { input: INPUT })],
  ["weaveTopicDominance", (p) => weaveTopicDominanceIntoPack(p, { input: INPUT })],
  ["applyHumanEditorGuardPass", (p) => applyHumanEditorGuardPass(p, { input: INPUT }, INPUT)],
];

let current = pack;
for (const [name, fn] of stages) {
  current = fn(current);
  const counts = reportStage(name, current, INPUT);
  if (counts.total >= 3) {
    console.log(`  >>> FAIL threshold at stage: ${name}`);
  }
}

console.log("\n4) 최종 판정");
const final = detectPlaceholderContamination(current, INPUT);
console.log(JSON.stringify(final, null, 2));

console.log("\n=== ROOT CAUSE FILES (SSOT) ===");
console.log(`
| 증상 | 원인 파일 | 변수/함수 |
|------|-----------|-----------|
| 「이용」 단독 반복 | lib/content/humanEditorGuardPass.js | capTopicMentionsInText → alt="이용" (수정됨) |
| 「전시 소식」「이 구성」 | lib/product/antiSeoSpamEngine.js | ANTI_SEO_SPAM_PRONOUNS.topic (가구 전용, 수정됨) |
| 「관련해서」 | lib/content/customerQuestionEngine.js | buildCustomerQuestionAnalysis |
| 「에 직접 가서」 | lib/content/humanColumnPolishEngine.js, lib/product/storyTargetEngine.js | seung 템플릿 |
| 「를 보면」 깨짐 | lib/content/v13ContentGate.js | weaveTopicDominanceIntoPack (구 hook prepend) |
| 재검수 단계 주입 | lib/product/contentQualityDelivery.js | applyDeliveryProsePolish → capTopicMentionsOnPack |
| 재검수 단계 주입 | lib/content/humanityFinishPass.js | capTopicMentionsOnPack |
| 업종 혼합 | lib/product/contentGateSystem.js | INDUSTRY_FORBIDDEN (cafe↔전시) |
| 노출 허용 버그 | lib/product/deliverySoftPass.js | placeholder 미포함 hardWithhold (수정됨) |
`);
