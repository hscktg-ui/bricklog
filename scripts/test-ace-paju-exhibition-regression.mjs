/**
 * Regression: 에이스침대·파주·전시 — 범용 패드·가짜 구어·조사 메타 본문 유출 금지
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import {
  GENERIC_DISPLAY_PAD_RES,
  GENERIC_EXPERIENCE_VOICE_RES,
  PROMPT_ONLY_RESEARCH_TEXT_RES,
} from "../lib/content/displayBodyGuards.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  mainKeyword: "루체3 전시소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "파주 매장에서 루체3 전시 라인업 체험 가능", source: "research" },
    { fact: "전시 기간·대상 모델은 매장 안내 기준", source: "research" },
    { fact: "프레임·매트리스 조합별 체험 동선이 다름", source: "research" },
  ],
};

const FORBIDDEN = [
  ...PROMPT_ONLY_RESEARCH_TEXT_RES.slice(0, 4),
  ...GENERIC_DISPLAY_PAD_RES.slice(0, 6),
  ...GENERIC_EXPERIENCE_VOICE_RES,
];

let pack = buildMissionProseFallbackPack(INPUT);
pack = applyV17PostWritePack(pack, { input: INPUT, ...INPUT }, "blog");
pack = applyHumanityFinishPass(pack, { input: INPUT, ...INPUT }, "blog");

const full = getBlogFullText(pack);

assert.ok(full.replace(/\s/g, "").length >= 800, "expected substantive body");
assert.ok(
  (pack.sections || []).length >= 3,
  `expected sections, got ${pack.sections?.length}`
);

for (const re of FORBIDDEN) {
  assert.ok(!re.test(full), `forbidden pattern in output: ${re}`);
}

const dupLine =
  /처음엔 어디부터 볼지 막막했는데,\s*기준만 정리해 두니까/g;
assert.ok(
  (full.match(dupLine) || []).length <= 1,
  "generic reflection line repeated"
);

console.log("OK: ace-paju-luce3 exhibition — no generic pad/voice leak");
console.log("  chars:", full.replace(/\s/g, "").length);
console.log("  sections:", pack.sections?.length);
