/**
 * BRICLOG Doctrine — Human Writer · Brand Memory · Anti SEO · Editor Principle
 */
import { buildBriclogMissionPromptBlock } from "../lib/product/briclogMission.js";
import { buildMasterSystemV6Brief } from "../lib/product/briclogMasterSystemV6.js";
import { applyAntiSeoSpamGate, scoreAntiSeoSpam } from "../lib/content/antiSeoSpamGate.js";
import { countTokenMentions } from "../lib/product/antiSeoSpamEngine.js";

const mission = buildBriclogMissionPromptBlock();
const required = [
  "ULTIMATE CONTENT ENGINE V20",
  "브랜드를 축적하는 AI 콘텐츠 팀",
  "Reviewer AI",
  "SIGNATURE WRITING ENGINE",
  "HUMAN WRITER ENGINE",
  "BRAND MEMORY PRIORITY",
  "ANTI SEO SPAM ENGINE",
  "EDITOR PRINCIPLE",
  "BRAND JOURNALIST DIRECTIVE",
  "브랜드 조사 시스템",
  "브랜드 기자이자 편집자",
  "연속된 이야기",
  "10년차 브랜드 에디터",
  "HUMAN BELIEF",
  "관점을 설명",
  "문제",
  "이유",
  "비교 기준",
];

const v6 = buildMasterSystemV6Brief();
if (!v6.includes("MASTER SYSTEM v6.2") || !v6.includes("기록이 쌓이면")) {
  console.error("FAIL: master system v6 brief missing");
  process.exit(1);
}

for (const needle of required) {
  if (!mission.includes(needle)) {
    console.error("FAIL: mission missing", needle);
    process.exit(1);
  }
}

const spammy = "템퍼 ".repeat(6) + "평택 ".repeat(5) + "모션베드 ".repeat(4);
const pack = {
  title: "템퍼 평택 모션베드",
  sections: [{ heading: "본문", body: spammy }],
};
const gated = applyAntiSeoSpamGate(pack, {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
});
const after = gated.sections[0].body;
if (countTokenMentions(after, "템퍼") > 3) {
  console.error("FAIL: brand repeat not softened", countTokenMentions(after, "템퍼"));
  process.exit(1);
}
const score = scoreAntiSeoSpam(after, {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
});
if (!score.ok && countTokenMentions(after, "평택") > 3) {
  console.error("FAIL: anti spam score", score.overused);
  process.exit(1);
}

console.log("OK: briclog doctrine — memory priority, anti spam, editor principle");
console.log("  brand mentions after gate:", countTokenMentions(after, "템퍼"));
